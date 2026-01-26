-- Create rate limit tracking table
CREATE TABLE public.rpc_rate_limits (
  identifier TEXT NOT NULL,
  function_name TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (identifier, function_name)
);

-- Create index for cleanup operations
CREATE INDEX idx_rate_limits_cleanup ON public.rpc_rate_limits(window_start);

-- Enable RLS on rate limits table (but allow functions to bypass via SECURITY DEFINER)
ALTER TABLE public.rpc_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create rate limit checking function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_function TEXT,
  p_max_calls INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Try to get existing rate limit record
  SELECT attempt_count, window_start INTO v_count, v_window_start
  FROM public.rpc_rate_limits
  WHERE identifier = p_identifier AND function_name = p_function;
  
  -- If no record exists, create one and allow
  IF NOT FOUND THEN
    INSERT INTO public.rpc_rate_limits (identifier, function_name, attempt_count, window_start)
    VALUES (p_identifier, p_function, 1, NOW())
    ON CONFLICT (identifier, function_name) DO UPDATE SET attempt_count = rpc_rate_limits.attempt_count + 1;
    RETURN TRUE;
  END IF;
  
  -- If window has expired, reset the counter
  IF v_window_start < NOW() - (p_window_seconds || ' seconds')::INTERVAL THEN
    UPDATE public.rpc_rate_limits 
    SET attempt_count = 1, window_start = NOW()
    WHERE identifier = p_identifier AND function_name = p_function;
    RETURN TRUE;
  END IF;
  
  -- If at or over limit, deny
  IF v_count >= p_max_calls THEN
    RETURN FALSE;
  END IF;
  
  -- Otherwise, increment counter and allow
  UPDATE public.rpc_rate_limits 
  SET attempt_count = attempt_count + 1
  WHERE identifier = p_identifier AND function_name = p_function;
  RETURN TRUE;
END;
$$;

-- Update validate_driving_token to include rate limiting (5 calls per 60 seconds)
CREATE OR REPLACE FUNCTION public.validate_driving_token(p_token_code text)
RETURNS TABLE(token_id uuid, is_valid boolean, speed_limit integer, time_limit_minutes integer, distance_limit_km numeric, geofence_center_lat numeric, geofence_center_lng numeric, geofence_radius_km numeric, guest_name text, car_name text, fuel_limit_percent integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token RECORD;
  v_car_name TEXT;
BEGIN
  -- Rate limit: 5 calls per 60 seconds per token code
  IF NOT check_rate_limit(UPPER(p_token_code), 'validate_token', 5, 60) THEN
    RETURN QUERY SELECT 
      NULL::UUID, FALSE, NULL::INTEGER, NULL::INTEGER, 
      NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::TEXT, NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  SELECT * INTO v_token FROM public.driving_tokens 
  WHERE token_code = UPPER(p_token_code)
  LIMIT 1;
  
  IF v_token IS NULL THEN
    RETURN QUERY SELECT 
      NULL::UUID, FALSE, NULL::INTEGER, NULL::INTEGER, 
      NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::TEXT, NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;
  
  IF v_token.expires_at < NOW() OR v_token.is_returned = true THEN
    RETURN QUERY SELECT 
      NULL::UUID, FALSE, NULL::INTEGER, NULL::INTEGER, 
      NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::TEXT, NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;
  
  -- Get car name if assigned
  IF v_token.car_id IS NOT NULL THEN
    SELECT c.name INTO v_car_name FROM public.cars c WHERE c.id = v_token.car_id;
  ELSE
    v_car_name := 'Unassigned';
  END IF;
  
  RETURN QUERY SELECT 
    v_token.id,
    TRUE,
    v_token.speed_limit,
    v_token.time_limit_minutes,
    v_token.distance_limit_km,
    v_token.geofence_center_lat,
    v_token.geofence_center_lng,
    v_token.geofence_radius_km,
    v_token.guest_name,
    v_car_name,
    v_token.fuel_limit_percent;
END;
$$;

-- Update send_guest_message to include rate limiting (10 calls per 60 seconds)
CREATE OR REPLACE FUNCTION public.send_guest_message(p_token_code text, p_session_secret uuid, p_message text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token RECORD;
  v_session RECORD;
BEGIN
  -- Rate limit: 10 messages per 60 seconds per session
  IF NOT check_rate_limit(p_session_secret::TEXT, 'send_message', 10, 60) THEN
    RETURN FALSE;
  END IF;

  IF LENGTH(p_message) > 500 THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_token FROM public.driving_tokens WHERE token_code = UPPER(p_token_code);
  
  IF v_token IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT * INTO v_session FROM public.driving_sessions 
  WHERE token_id = v_token.id AND session_secret = p_session_secret AND status = 'active';
  
  IF v_session IS NULL THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO public.messages (token_id, sender_type, message, is_sos)
  VALUES (v_token.id, 'guest', p_message, false);
  
  RETURN TRUE;
END;
$$;

-- Update send_sos to include rate limiting (3 calls per 300 seconds)
CREATE OR REPLACE FUNCTION public.send_sos(p_token_code text, p_session_secret uuid, p_message text DEFAULT 'EMERGENCY SOS!'::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token RECORD;
  v_session RECORD;
BEGIN
  -- Rate limit: 3 SOS calls per 300 seconds (5 minutes) per session
  IF NOT check_rate_limit(p_session_secret::TEXT, 'send_sos', 3, 300) THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_token FROM public.driving_tokens WHERE token_code = UPPER(p_token_code);
  
  IF v_token IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT * INTO v_session FROM public.driving_sessions 
  WHERE token_id = v_token.id AND session_secret = p_session_secret AND status = 'active';
  
  IF v_session IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Create SOS message
  INSERT INTO public.messages (token_id, sender_type, message, is_sos)
  VALUES (v_token.id, 'guest', p_message, true);
  
  RETURN TRUE;
END;
$$;

-- Update create_session_alert to include rate limiting (20 calls per 60 seconds)
CREATE OR REPLACE FUNCTION public.create_session_alert(p_session_id uuid, p_session_secret uuid, p_message text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Rate limit: 20 alerts per 60 seconds per session
  IF NOT check_rate_limit(p_session_id::TEXT, 'create_alert', 20, 60) THEN
    RETURN FALSE;
  END IF;

  -- Validate session secret
  SELECT * INTO v_session FROM public.driving_sessions 
  WHERE id = p_session_id AND session_secret = p_session_secret AND status = 'active'
  LIMIT 1;
  
  IF v_session IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Validate message length
  IF LENGTH(p_message) > 500 THEN
    RETURN FALSE;
  END IF;
  
  -- Create alert
  INSERT INTO public.alerts (session_id, token_id, message)
  VALUES (p_session_id, v_session.token_id, p_message);
  
  -- Increment violation count
  UPDATE public.driving_sessions 
  SET total_violations = total_violations + 1
  WHERE id = p_session_id;
  
  RETURN TRUE;
END;
$$;

-- Update update_session_telemetry (with extended params) to include rate limiting (120 calls per 60 seconds)
CREATE OR REPLACE FUNCTION public.update_session_telemetry(p_session_id uuid, p_session_secret uuid, p_speed integer, p_distance_km numeric, p_fuel_percent integer DEFAULT NULL::integer, p_sudden_stop boolean DEFAULT false)
RETURNS TABLE(success boolean, speed_violation boolean, current_speed_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_token RECORD;
  v_is_violation BOOLEAN := FALSE;
BEGIN
  -- Rate limit: 120 telemetry updates per 60 seconds (2 per second max)
  IF NOT check_rate_limit(p_session_id::TEXT, 'update_telemetry', 120, 60) THEN
    RETURN QUERY SELECT FALSE, FALSE, NULL::INTEGER;
    RETURN;
  END IF;

  SELECT * INTO v_session FROM public.driving_sessions 
  WHERE id = p_session_id AND session_secret = p_session_secret AND status = 'active'
  LIMIT 1;
  
  IF v_session IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, NULL::INTEGER;
    RETURN;
  END IF;
  
  SELECT * INTO v_token FROM public.driving_tokens WHERE id = v_session.token_id;
  
  IF p_speed < 0 OR p_speed > 300 THEN
    RETURN QUERY SELECT FALSE, FALSE, v_token.speed_limit;
    RETURN;
  END IF;
  
  IF p_distance_km < 0 OR p_distance_km > 1000 THEN
    RETURN QUERY SELECT FALSE, FALSE, v_token.speed_limit;
    RETURN;
  END IF;
  
  IF p_speed > v_token.speed_limit THEN
    v_is_violation := TRUE;
  END IF;
  
  UPDATE public.driving_sessions SET
    current_speed = p_speed,
    current_distance_km = GREATEST(current_distance_km, p_distance_km),
    max_speed_reached = GREATEST(max_speed_reached, p_speed),
    current_fuel_percent = COALESCE(p_fuel_percent, current_fuel_percent),
    sudden_stops_count = CASE WHEN p_sudden_stop THEN sudden_stops_count + 1 ELSE sudden_stops_count END,
    updated_at = NOW()
  WHERE id = p_session_id;
  
  RETURN QUERY SELECT TRUE, v_is_violation, v_token.speed_limit;
END;
$$;

-- Create a cleanup function for old rate limit entries (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete entries older than 1 hour
  DELETE FROM public.rpc_rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;