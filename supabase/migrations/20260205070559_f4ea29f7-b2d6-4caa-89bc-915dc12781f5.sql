-- Update validate_driving_token to check for withheld status (is_active = false AND is_used = true means withheld)
CREATE OR REPLACE FUNCTION public.validate_driving_token(p_token_code text)
 RETURNS TABLE(token_id uuid, is_valid boolean, speed_limit integer, time_limit_minutes integer, distance_limit_km numeric, geofence_center_lat numeric, geofence_center_lng numeric, geofence_radius_km numeric, guest_name text, car_name text, fuel_limit_percent integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Check if token is expired, returned, or withheld
  -- Withheld = is_used=true AND is_active=false (owner temporarily disabled it)
  IF v_token.expires_at < NOW() OR v_token.is_returned = true OR (v_token.is_used = true AND v_token.is_active = false) THEN
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
$function$;

-- Create extension_requests table for guests to request parameter changes
CREATE TABLE public.extension_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID NOT NULL REFERENCES public.driving_tokens(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL, -- 'time', 'distance', 'speed', 'fuel', 'geofence'
  requested_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.extension_requests ENABLE ROW LEVEL SECURITY;

-- Owners can view extension requests for their tokens
CREATE POLICY "Owners can view extension requests" ON public.extension_requests
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.driving_tokens dt
    WHERE dt.id = extension_requests.token_id AND dt.master_user_id = auth.uid()
  )
);

-- Owners can update extension requests for their tokens
CREATE POLICY "Owners can update extension requests" ON public.extension_requests
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.driving_tokens dt
    WHERE dt.id = extension_requests.token_id AND dt.master_user_id = auth.uid()
  )
);

-- RPC function for guests to send extension requests
CREATE OR REPLACE FUNCTION public.send_extension_request(
  p_token_code TEXT,
  p_session_secret UUID,
  p_request_type TEXT,
  p_requested_value NUMERIC,
  p_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token RECORD;
  v_session RECORD;
  v_current_value NUMERIC;
BEGIN
  -- Rate limit: 5 requests per 5 minutes per session
  IF NOT check_rate_limit(p_session_secret::TEXT, 'extension_request', 5, 300) THEN
    RETURN FALSE;
  END IF;

  -- Validate request type
  IF p_request_type NOT IN ('time', 'distance', 'speed', 'fuel', 'geofence') THEN
    RETURN FALSE;
  END IF;

  -- Get token
  SELECT * INTO v_token FROM public.driving_tokens WHERE token_code = UPPER(p_token_code);
  
  IF v_token IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verify session
  SELECT * INTO v_session FROM public.driving_sessions 
  WHERE token_id = v_token.id AND session_secret = p_session_secret AND status = 'active';
  
  IF v_session IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get current value based on request type
  CASE p_request_type
    WHEN 'time' THEN v_current_value := v_token.time_limit_minutes;
    WHEN 'distance' THEN v_current_value := v_token.distance_limit_km;
    WHEN 'speed' THEN v_current_value := v_token.speed_limit;
    WHEN 'fuel' THEN v_current_value := v_token.fuel_limit_percent;
    WHEN 'geofence' THEN v_current_value := v_token.geofence_radius_km;
  END CASE;

  -- Insert extension request
  INSERT INTO public.extension_requests (
    token_id, request_type, requested_value, current_value, message
  ) VALUES (
    v_token.id, p_request_type, p_requested_value, v_current_value, p_message
  );

  -- Also create a message to notify the owner
  INSERT INTO public.messages (token_id, sender_type, message, is_sos)
  VALUES (v_token.id, 'guest', 
    'Extension request: ' || p_request_type || ' from ' || v_current_value || ' to ' || p_requested_value || 
    CASE WHEN p_message IS NOT NULL THEN ' - ' || p_message ELSE '' END,
    false
  );
  
  RETURN TRUE;
END;
$function$;

-- Enable realtime for extension_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.extension_requests;