-- Fix the overly permissive UPDATE policy for driving_sessions
DROP POLICY IF EXISTS "Active sessions can be updated" ON public.driving_sessions;

-- Add a session_secret column to verify session ownership without authentication
ALTER TABLE public.driving_sessions ADD COLUMN IF NOT EXISTS session_secret UUID DEFAULT gen_random_uuid();

-- Create secure RPC function for starting a drive session
CREATE OR REPLACE FUNCTION public.start_driving_session(p_token_code TEXT)
RETURNS TABLE(
  session_id UUID,
  session_secret UUID,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token RECORD;
  v_session_id UUID;
  v_session_secret UUID;
BEGIN
  -- Validate token
  SELECT * INTO v_token FROM public.driving_tokens 
  WHERE token_code = UPPER(p_token_code)
  LIMIT 1;
  
  IF v_token IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, FALSE, 'Invalid token'::TEXT;
    RETURN;
  END IF;
  
  IF v_token.expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, FALSE, 'Token expired'::TEXT;
    RETURN;
  END IF;
  
  -- Generate session secret
  v_session_secret := gen_random_uuid();
  
  -- Create session
  INSERT INTO public.driving_sessions (token_id, status, start_time, session_secret)
  VALUES (v_token.id, 'active', NOW(), v_session_secret)
  RETURNING id INTO v_session_id;
  
  -- Mark token as used and active
  UPDATE public.driving_tokens SET is_active = true, is_used = true WHERE id = v_token.id;
  
  RETURN QUERY SELECT v_session_id, v_session_secret, TRUE, NULL::TEXT;
END;
$$;

-- Create secure RPC function for updating session telemetry with validation
CREATE OR REPLACE FUNCTION public.update_session_telemetry(
  p_session_id UUID,
  p_session_secret UUID,
  p_speed INTEGER,
  p_distance_km NUMERIC
)
RETURNS TABLE(
  success BOOLEAN,
  speed_violation BOOLEAN,
  current_speed_limit INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_token RECORD;
  v_is_violation BOOLEAN := FALSE;
BEGIN
  -- Validate session secret
  SELECT * INTO v_session FROM public.driving_sessions 
  WHERE id = p_session_id AND session_secret = p_session_secret AND status = 'active'
  LIMIT 1;
  
  IF v_session IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, NULL::INTEGER;
    RETURN;
  END IF;
  
  -- Get token for speed limit
  SELECT * INTO v_token FROM public.driving_tokens WHERE id = v_session.token_id;
  
  -- Validate speed is reasonable (0-300 km/h)
  IF p_speed < 0 OR p_speed > 300 THEN
    RETURN QUERY SELECT FALSE, FALSE, v_token.speed_limit;
    RETURN;
  END IF;
  
  -- Check for speed violation
  IF p_speed > v_token.speed_limit THEN
    v_is_violation := TRUE;
  END IF;
  
  -- Update session with validated data
  UPDATE public.driving_sessions SET
    current_speed = p_speed,
    current_distance_km = GREATEST(current_distance_km, p_distance_km),
    max_speed_reached = GREATEST(max_speed_reached, p_speed),
    updated_at = NOW()
  WHERE id = p_session_id;
  
  RETURN QUERY SELECT TRUE, v_is_violation, v_token.speed_limit;
END;
$$;

-- Create secure RPC function for creating alerts
CREATE OR REPLACE FUNCTION public.create_session_alert(
  p_session_id UUID,
  p_session_secret UUID,
  p_message TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
BEGIN
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

-- Create secure RPC function for stopping a session
CREATE OR REPLACE FUNCTION public.stop_driving_session(
  p_session_id UUID,
  p_session_secret UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Validate session secret
  SELECT * INTO v_session FROM public.driving_sessions 
  WHERE id = p_session_id AND session_secret = p_session_secret AND status = 'active'
  LIMIT 1;
  
  IF v_session IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update session
  UPDATE public.driving_sessions SET
    status = 'completed',
    end_time = NOW()
  WHERE id = p_session_id;
  
  -- Mark token as inactive
  UPDATE public.driving_tokens SET is_active = false WHERE id = v_session.token_id;
  
  RETURN TRUE;
END;
$$;

-- Masters can still update their own sessions directly (for admin purposes)
CREATE POLICY "Masters can update their sessions" 
ON public.driving_sessions FOR UPDATE 
USING (public.user_owns_token(token_id));