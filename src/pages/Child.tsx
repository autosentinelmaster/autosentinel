import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Gauge, Clock, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type DrivingToken = Database['public']['Tables']['driving_tokens']['Row'];

export default function Child() {
  const [searchParams] = useSearchParams();
  const tokenCode = searchParams.get('token');
  const [token, setToken] = useState<DrivingToken | null>(null);
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
    const { data, error } = await supabase
      .from('driving_tokens')
      .select('*')
      .eq('token_code', tokenCode)
      .maybeSingle();

    if (error || !data) {
      setError('Invalid or expired token');
    } else {
      setToken(data);
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
            <p>Use token <code className="bg-secondary px-2 py-1 rounded">{token.token_code}</code> in the Test Car Simulator</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
