
-- Add HTML tag stripping to send_guest_message
CREATE OR REPLACE FUNCTION public.send_guest_message(p_token_code text, p_session_secret uuid, p_message text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_token RECORD;
  v_session RECORD;
  v_clean_message TEXT;
BEGIN
  -- Rate limit: 10 messages per 60 seconds per session
  IF NOT check_rate_limit(p_session_secret::TEXT, 'send_message', 10, 60) THEN
    RETURN FALSE;
  END IF;

  -- Sanitize: strip HTML tags
  v_clean_message := regexp_replace(p_message, '<[^>]*>', '', 'g');
  -- Trim whitespace
  v_clean_message := TRIM(v_clean_message);

  IF LENGTH(v_clean_message) > 500 OR LENGTH(v_clean_message) = 0 THEN
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
  VALUES (v_token.id, 'guest', v_clean_message, false);
  
  RETURN TRUE;
END;
$function$;

-- Add HTML tag stripping to send_sos
CREATE OR REPLACE FUNCTION public.send_sos(p_token_code text, p_session_secret uuid, p_message text DEFAULT 'EMERGENCY SOS!'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_token RECORD;
  v_session RECORD;
  v_clean_message TEXT;
BEGIN
  -- Rate limit: 3 SOS calls per 300 seconds (5 minutes) per session
  IF NOT check_rate_limit(p_session_secret::TEXT, 'send_sos', 3, 300) THEN
    RETURN FALSE;
  END IF;

  -- Sanitize: strip HTML tags and trim
  v_clean_message := regexp_replace(p_message, '<[^>]*>', '', 'g');
  v_clean_message := TRIM(v_clean_message);

  IF LENGTH(v_clean_message) = 0 THEN
    v_clean_message := 'EMERGENCY SOS!';
  END IF;

  IF LENGTH(v_clean_message) > 500 THEN
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
  VALUES (v_token.id, 'guest', v_clean_message, true);
  
  RETURN TRUE;
END;
$function$;

-- Add HTML tag stripping to send_extension_request
CREATE OR REPLACE FUNCTION public.send_extension_request(p_token_code text, p_session_secret uuid, p_request_type text, p_requested_value numeric, p_message text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_token RECORD;
  v_session RECORD;
  v_current_value NUMERIC;
  v_clean_message TEXT;
BEGIN
  -- Rate limit: 5 requests per 5 minutes per session
  IF NOT check_rate_limit(p_session_secret::TEXT, 'extension_request', 5, 300) THEN
    RETURN FALSE;
  END IF;

  -- Validate request type
  IF p_request_type NOT IN ('time', 'distance', 'speed', 'fuel', 'geofence') THEN
    RETURN FALSE;
  END IF;

  -- Sanitize message if provided
  IF p_message IS NOT NULL THEN
    v_clean_message := regexp_replace(p_message, '<[^>]*>', '', 'g');
    v_clean_message := TRIM(v_clean_message);
    IF LENGTH(v_clean_message) > 500 THEN
      RETURN FALSE;
    END IF;
    IF LENGTH(v_clean_message) = 0 THEN
      v_clean_message := NULL;
    END IF;
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
    v_token.id, p_request_type, p_requested_value, v_current_value, v_clean_message
  );

  -- Also create a message to notify the owner
  INSERT INTO public.messages (token_id, sender_type, message, is_sos)
  VALUES (v_token.id, 'guest', 
    'Extension request: ' || p_request_type || ' from ' || v_current_value || ' to ' || p_requested_value || 
    CASE WHEN v_clean_message IS NOT NULL THEN ' - ' || v_clean_message ELSE '' END,
    false
  );
  
  RETURN TRUE;
END;
$function$;
