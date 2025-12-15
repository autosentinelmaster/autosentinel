import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Gauge, Clock, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';

// Validated token data from secure RPC function (minimal exposure)
interface ValidatedToken {
  token_id: string;
  is_valid: boolean;
  speed_limit: number;
  time_limit_minutes: number;
  distance_limit_km: number;
  geofence_center_lat: number;
  geofence_center_lng: number;
  geofence_radius_km: number;
  child_name: string;
}

export default function Child() {
  const [searchParams] = useSearchParams();
  const tokenCode = searchParams.get('token');
  const [token, setToken] = useState<ValidatedToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tokenCode) {
      fetchToken();
    } else {
      setLoading(false);
      setError('No token provided');
    }
  }, [tokenCode]);

  const fetchToken = async () => {
    // Use secure RPC function instead of direct table query
    const { data, error: rpcError } = await supabase.rpc('validate_driving_token', {
      p_token_code: tokenCode?.toUpperCase() || ''
    });

    if (rpcError) {
      setError('Token validation failed');
      setLoading(false);
      return;
    }

    const result = data?.[0];
    if (!result || !result.is_valid) {
      setError('Invalid or expired token');
    } else {
      setToken(result as ValidatedToken);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Shield className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold mb-2">Token Error</h2>
            <p className="text-muted-foreground">{error || 'Invalid token'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <Shield className="h-10 w-10 text-primary mx-auto mb-2" />
          <h1 className="text-2xl font-display font-bold">Welcome, {token.child_name}</h1>
          <p className="text-muted-foreground">Your driving restrictions</p>
        </div>

        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Token Valid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <span className="flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" /> Speed Limit</span>
              <span className="font-bold">{token.speed_limit} km/h</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <span className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Time Limit</span>
              <span className="font-bold">{token.time_limit_minutes} mins</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <span className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Distance Limit</span>
              <span className="font-bold">{Number(token.distance_limit_km)} km</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/30">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            <p>Use your token in the Test Car Simulator to begin driving</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
