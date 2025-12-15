-- Fix security issue 1: Token Code Enumeration
-- Drop the public SELECT policy that allows anyone to view all tokens
DROP POLICY IF EXISTS "Anyone can view token by code for validation" ON public.driving_tokens;

-- Create a secure RPC function for token validation that only returns needed data
CREATE OR REPLACE FUNCTION public.validate_driving_token(p_token_code TEXT)
RETURNS TABLE(
  token_id UUID,
  is_valid BOOLEAN,
  speed_limit INTEGER,
  time_limit_minutes INTEGER,
  distance_limit_km NUMERIC,
  geofence_center_lat NUMERIC,
  geofence_center_lng NUMERIC,
  geofence_radius_km NUMERIC,
  child_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token RECORD;
BEGIN
  SELECT * INTO v_token FROM public.driving_tokens 
  WHERE token_code = UPPER(p_token_code)
  LIMIT 1;
  
  IF v_token IS NULL THEN
    RETURN QUERY SELECT 
      NULL::UUID, FALSE, NULL::INTEGER, NULL::INTEGER, 
      NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::TEXT;
    RETURN;
  END IF;
  
  IF v_token.expires_at < NOW() THEN
    RETURN QUERY SELECT 
      NULL::UUID, FALSE, NULL::INTEGER, NULL::INTEGER, 
      NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::TEXT;
    RETURN;
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
    v_token.child_name;
END;
$$;

-- Fix security issue 2: Alert Messages Exposed to Public
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "Anyone can create alerts" ON public.alerts;
DROP POLICY IF EXISTS "Anyone can update alerts" ON public.alerts;

-- Create helper function to check if user owns a token
CREATE OR REPLACE FUNCTION public.user_owns_token(p_token_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.driving_tokens
    WHERE id = p_token_id AND master_user_id = auth.uid()
  );
$$;

-- Create helper function to check if session has valid token (for anonymous session updates)
CREATE OR REPLACE FUNCTION public.session_has_token(p_session_id UUID, p_token_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.driving_sessions
    WHERE id = p_session_id AND token_id = p_token_id
  );
$$;

-- Alerts: Masters can view alerts for their tokens
CREATE POLICY "Masters can view alerts for their tokens" 
ON public.alerts FOR SELECT 
USING (public.user_owns_token(token_id));

-- Alerts: Allow insert from valid sessions (for simulator)
CREATE POLICY "Sessions can create alerts" 
ON public.alerts FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.driving_sessions ds
    WHERE ds.id = session_id AND ds.token_id = token_id AND ds.status = 'active'
  )
);

-- Alerts: Masters can update alerts for their tokens
CREATE POLICY "Masters can update alerts for their tokens" 
ON public.alerts FOR UPDATE 
USING (public.user_owns_token(token_id));

-- Fix driving_sessions policies
DROP POLICY IF EXISTS "Anyone can view sessions" ON public.driving_sessions;
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.driving_sessions;
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.driving_sessions;

-- Masters can view sessions for their tokens
CREATE POLICY "Masters can view sessions for their tokens" 
ON public.driving_sessions FOR SELECT 
USING (public.user_owns_token(token_id));

-- Allow session creation with valid token
CREATE POLICY "Valid tokens can create sessions" 
ON public.driving_sessions FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.driving_tokens 
    WHERE id = token_id AND expires_at > NOW()
  )
);

-- Allow session updates for active sessions with matching token
CREATE POLICY "Active sessions can be updated" 
ON public.driving_sessions FOR UPDATE 
USING (
  status = 'active' OR public.user_owns_token(token_id)
);

-- Fix violations policies
DROP POLICY IF EXISTS "Anyone can view violations" ON public.violations;
DROP POLICY IF EXISTS "Anyone can create violations" ON public.violations;

-- Masters can view violations for their sessions
CREATE POLICY "Masters can view violations for their sessions" 
ON public.violations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.driving_sessions ds
    JOIN public.driving_tokens dt ON ds.token_id = dt.id
    WHERE ds.id = session_id AND dt.master_user_id = auth.uid()
  )
);

-- Allow violation creation for active sessions
CREATE POLICY "Active sessions can create violations" 
ON public.violations FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.driving_sessions ds
    WHERE ds.id = session_id AND ds.status = 'active'
  )
);