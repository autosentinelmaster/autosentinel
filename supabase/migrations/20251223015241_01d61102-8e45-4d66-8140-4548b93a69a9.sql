-- Create cars table for multiple vehicles per owner
CREATE TABLE public.cars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  make TEXT,
  model TEXT,
  license_plate TEXT,
  fuel_capacity_liters NUMERIC NOT NULL DEFAULT 50.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their cars" ON public.cars FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can create cars" ON public.cars FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their cars" ON public.cars FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their cars" ON public.cars FOR DELETE USING (auth.uid() = owner_id);

-- Rename child_name to guest_name and child_phone to guest_phone
ALTER TABLE public.driving_tokens RENAME COLUMN child_name TO guest_name;
ALTER TABLE public.driving_tokens RENAME COLUMN child_phone TO guest_phone;

-- Add new columns to driving_tokens
ALTER TABLE public.driving_tokens ADD COLUMN car_id UUID REFERENCES public.cars(id);
ALTER TABLE public.driving_tokens ADD COLUMN validity_hours INTEGER NOT NULL DEFAULT 24;
ALTER TABLE public.driving_tokens ADD COLUMN fuel_limit_percent INTEGER NOT NULL DEFAULT 80;
ALTER TABLE public.driving_tokens ADD COLUMN is_returned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.driving_tokens ADD COLUMN returned_at TIMESTAMP WITH TIME ZONE;

-- Add new columns to driving_sessions
ALTER TABLE public.driving_sessions ADD COLUMN current_fuel_percent INTEGER NOT NULL DEFAULT 100;
ALTER TABLE public.driving_sessions ADD COLUMN sudden_stops_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.driving_sessions ADD COLUMN seat_belt_confirmed BOOLEAN NOT NULL DEFAULT false;

-- Create messages table for owner-guest communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID NOT NULL REFERENCES public.driving_tokens(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('owner', 'guest')),
  message TEXT NOT NULL,
  is_sos BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow owners to view messages for their tokens
CREATE POLICY "Owners can view messages for their tokens" ON public.messages FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.driving_tokens dt WHERE dt.id = messages.token_id AND dt.master_user_id = auth.uid()
));

-- Allow owners to send messages
CREATE POLICY "Owners can send messages" ON public.messages FOR INSERT 
WITH CHECK (
  sender_type = 'owner' AND 
  EXISTS (SELECT 1 FROM public.driving_tokens dt WHERE dt.id = messages.token_id AND dt.master_user_id = auth.uid())
);

-- Allow owners to update message read status
CREATE POLICY "Owners can update messages" ON public.messages FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.driving_tokens dt WHERE dt.id = messages.token_id AND dt.master_user_id = auth.uid()
));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Add sudden_stop violation type
ALTER TYPE public.violation_type ADD VALUE IF NOT EXISTS 'sudden_stop';
ALTER TYPE public.violation_type ADD VALUE IF NOT EXISTS 'fuel';

-- Update validate_driving_token to include car info
DROP FUNCTION IF EXISTS public.validate_driving_token(text);

CREATE OR REPLACE FUNCTION public.validate_driving_token(p_token_code text)
RETURNS TABLE(
  token_id uuid,
  is_valid boolean,
  speed_limit integer,
  time_limit_minutes integer,
  distance_limit_km numeric,
  geofence_center_lat numeric,
  geofence_center_lng numeric,
  geofence_radius_km numeric,
  guest_name text,
  car_name text,
  fuel_limit_percent integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token RECORD;
  v_car_name TEXT;
BEGIN
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
$function$;

-- Create function to return token
CREATE OR REPLACE FUNCTION public.return_token(p_token_code text, p_session_secret uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token RECORD;
  v_session RECORD;
BEGIN
  SELECT * INTO v_token FROM public.driving_tokens WHERE token_code = UPPER(p_token_code);
  
  IF v_token IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verify there's an active session with this secret
  SELECT * INTO v_session FROM public.driving_sessions 
  WHERE token_id = v_token.id AND session_secret = p_session_secret AND status = 'active';
  
  IF v_session IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- End the session
  UPDATE public.driving_sessions SET status = 'completed', end_time = NOW() WHERE id = v_session.id;
  
  -- Mark token as returned
  UPDATE public.driving_tokens SET is_returned = true, returned_at = NOW(), is_active = false WHERE id = v_token.id;
  
  RETURN TRUE;
END;
$function$;

-- Create function to send SOS
CREATE OR REPLACE FUNCTION public.send_sos(p_token_code text, p_session_secret uuid, p_message text DEFAULT 'EMERGENCY SOS!')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token RECORD;
  v_session RECORD;
BEGIN
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
$function$;

-- Create function for guest to send message
CREATE OR REPLACE FUNCTION public.send_guest_message(p_token_code text, p_session_secret uuid, p_message text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token RECORD;
  v_session RECORD;
BEGIN
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
$function$;

-- Update telemetry function to handle fuel and sudden stops
CREATE OR REPLACE FUNCTION public.update_session_telemetry(
  p_session_id uuid, 
  p_session_secret uuid, 
  p_speed integer, 
  p_distance_km numeric,
  p_fuel_percent integer DEFAULT NULL,
  p_sudden_stop boolean DEFAULT false
)
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
$function$;

-- Function to confirm seat belt
CREATE OR REPLACE FUNCTION public.confirm_seat_belt(p_session_id uuid, p_session_secret uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session RECORD;
BEGIN
  SELECT * INTO v_session FROM public.driving_sessions 
  WHERE id = p_session_id AND session_secret = p_session_secret AND status = 'active';
  
  IF v_session IS NULL THEN
    RETURN FALSE;
  END IF;
  
  UPDATE public.driving_sessions SET seat_belt_confirmed = true WHERE id = p_session_id;
  RETURN TRUE;
END;
$function$;