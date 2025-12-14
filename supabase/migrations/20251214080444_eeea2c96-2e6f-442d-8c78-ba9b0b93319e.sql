
-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('master', 'child');

-- Create enum for session status
CREATE TYPE public.session_status AS ENUM ('pending', 'active', 'completed', 'violated');

-- Create enum for violation type
CREATE TYPE public.violation_type AS ENUM ('speed', 'geofence', 'time');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role user_role NOT NULL DEFAULT 'master',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create driving tokens table (OTP for car access)
CREATE TABLE public.driving_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token_code TEXT NOT NULL UNIQUE,
  child_name TEXT NOT NULL,
  child_phone TEXT,
  speed_limit INTEGER NOT NULL DEFAULT 60,
  time_limit_minutes INTEGER NOT NULL DEFAULT 30,
  distance_limit_km DECIMAL(10,2) NOT NULL DEFAULT 10.0,
  geofence_center_lat DECIMAL(10,7) NOT NULL DEFAULT 18.5204,
  geofence_center_lng DECIMAL(10,7) NOT NULL DEFAULT 73.8567,
  geofence_radius_km DECIMAL(10,2) NOT NULL DEFAULT 5.0,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS on driving_tokens
ALTER TABLE public.driving_tokens ENABLE ROW LEVEL SECURITY;

-- Driving tokens policies
CREATE POLICY "Masters can view their own tokens" 
ON public.driving_tokens FOR SELECT 
USING (auth.uid() = master_user_id);

CREATE POLICY "Masters can create tokens" 
ON public.driving_tokens FOR INSERT 
WITH CHECK (auth.uid() = master_user_id);

CREATE POLICY "Masters can update their tokens" 
ON public.driving_tokens FOR UPDATE 
USING (auth.uid() = master_user_id);

CREATE POLICY "Anyone can view token by code for validation" 
ON public.driving_tokens FOR SELECT 
USING (TRUE);

-- Create driving sessions table
CREATE TABLE public.driving_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES public.driving_tokens(id) ON DELETE CASCADE NOT NULL,
  status session_status NOT NULL DEFAULT 'pending',
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  current_speed INTEGER NOT NULL DEFAULT 0,
  current_distance_km DECIMAL(10,2) NOT NULL DEFAULT 0.0,
  current_lat DECIMAL(10,7),
  current_lng DECIMAL(10,7),
  max_speed_reached INTEGER NOT NULL DEFAULT 0,
  total_violations INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on driving_sessions
ALTER TABLE public.driving_sessions ENABLE ROW LEVEL SECURITY;

-- Driving sessions policies - public read for simulation
CREATE POLICY "Anyone can view sessions" 
ON public.driving_sessions FOR SELECT 
USING (TRUE);

CREATE POLICY "Anyone can create sessions" 
ON public.driving_sessions FOR INSERT 
WITH CHECK (TRUE);

CREATE POLICY "Anyone can update sessions" 
ON public.driving_sessions FOR UPDATE 
USING (TRUE);

-- Create violations table
CREATE TABLE public.violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.driving_sessions(id) ON DELETE CASCADE NOT NULL,
  violation_type violation_type NOT NULL,
  description TEXT NOT NULL,
  speed_at_violation INTEGER,
  distance_at_violation DECIMAL(10,2),
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on violations
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;

-- Violations policies
CREATE POLICY "Anyone can view violations" 
ON public.violations FOR SELECT 
USING (TRUE);

CREATE POLICY "Anyone can create violations" 
ON public.violations FOR INSERT 
WITH CHECK (TRUE);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.driving_sessions(id) ON DELETE CASCADE NOT NULL,
  token_id UUID REFERENCES public.driving_tokens(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on alerts
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Alerts policies
CREATE POLICY "Anyone can view alerts" 
ON public.alerts FOR SELECT 
USING (TRUE);

CREATE POLICY "Anyone can create alerts" 
ON public.alerts FOR INSERT 
WITH CHECK (TRUE);

CREATE POLICY "Anyone can update alerts" 
ON public.alerts FOR UPDATE 
USING (TRUE);

-- Enable realtime for sessions and alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.driving_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.violations;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON public.driving_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique token code
CREATE OR REPLACE FUNCTION public.generate_token_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  result := result || '-';
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  result := result || '-';
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
