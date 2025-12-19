-- Add distance validation to update_session_telemetry function
CREATE OR REPLACE FUNCTION public.update_session_telemetry(p_session_id uuid, p_session_secret uuid, p_speed integer, p_distance_km numeric)
 RETURNS TABLE(success boolean, speed_violation boolean, current_speed_limit integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Validate distance is reasonable (0-1000 km)
  IF p_distance_km < 0 OR p_distance_km > 1000 THEN
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
$function$;