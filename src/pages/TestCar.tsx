import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Car, Gauge, Clock, MapPin, AlertTriangle, Play, Square, Key } from 'lucide-react';
import { toast } from 'sonner';

// Validated token data from RPC function (minimal exposure)
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

export default function TestCar() {
  const [tokenCode, setTokenCode] = useState('');
  const [token, setToken] = useState<ValidatedToken | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionSecret, setSessionSecret] = useState<string | null>(null);
  const [driving, setDriving] = useState(false);
  const [speed, setSpeed] = useState([0]);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [carPosition, setCarPosition] = useState({ x: 50, y: 50 });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAlertRef = useRef<{ speed: number; geofence: number }>({ speed: 0, geofence: 0 });

  const geofenceRadius = token ? Number(token.geofence_radius_km) : 5;
  const distanceFromCenter = Math.sqrt(Math.pow(carPosition.x - 50, 2) + Math.pow(carPosition.y - 50, 2)) / 40 * geofenceRadius;
  const isOutsideGeofence = distanceFromCenter > geofenceRadius;

  const verifyToken = async () => {
    // Use secure RPC function instead of direct table query
    const { data, error } = await supabase.rpc('validate_driving_token', {
      p_token_code: tokenCode.toUpperCase()
    });

    if (error) {
      toast.error('Token validation failed');
      return;
    }

    const result = data?.[0];
    if (!result || !result.is_valid) {
      toast.error('Invalid or expired token');
      return;
    }

    setToken(result as ValidatedToken);
    toast.success('Token verified! Ready to drive.');
  };

  const startDrive = async () => {
    if (!token) return;

    // Use secure RPC function to start session
    const { data, error } = await supabase.rpc('start_driving_session', {
      p_token_code: tokenCode.toUpperCase()
    });

    if (error || !data?.[0]?.success) {
      toast.error(data?.[0]?.error_message || 'Failed to start session');
      return;
    }

    const result = data[0];
    setSessionId(result.session_id);
    setSessionSecret(result.session_secret);
    setDriving(true);
    toast.success('Drive started!');
  };

  const stopDrive = async () => {
    if (!sessionId || !sessionSecret) return;

    // Use secure RPC function to stop session
    const { data } = await supabase.rpc('stop_driving_session', {
      p_session_id: sessionId,
      p_session_secret: sessionSecret
    });

    if (data) {
      setDriving(false);
      setSessionSecret(null);
      toast.success('Drive ended!');
    } else {
      toast.error('Failed to end session');
    }
  };

  useEffect(() => {
    if (driving && sessionId && sessionSecret && token) {
      intervalRef.current = setInterval(async () => {
        setElapsed(prev => prev + 1);
        const newDistance = distance + (speed[0] / 3600);
        setDistance(newDistance);

        // Use secure RPC function to update telemetry with server-side validation
        const { data } = await supabase.rpc('update_session_telemetry', {
          p_session_id: sessionId,
          p_session_secret: sessionSecret,
          p_speed: speed[0],
          p_distance_km: newDistance
        });

        const result = data?.[0];
        
        // Check for speed violation (with rate limiting - max 1 alert per 10 seconds)
        const now = Date.now();
        if (result?.speed_violation && now - lastAlertRef.current.speed > 10000) {
          await supabase.rpc('create_session_alert', {
            p_session_id: sessionId,
            p_session_secret: sessionSecret,
            p_message: `Speed violation: ${speed[0]} km/h (limit: ${token.speed_limit} km/h)`
          });
          lastAlertRef.current.speed = now;
        }

        // Check for geofence breach (with rate limiting)
        if (isOutsideGeofence && now - lastAlertRef.current.geofence > 10000) {
          await supabase.rpc('create_session_alert', {
            p_session_id: sessionId,
            p_session_secret: sessionSecret,
            p_message: `Geofence breach: Vehicle is ${distanceFromCenter.toFixed(1)} km from center`
          });
          lastAlertRef.current.geofence = now;
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [driving, speed, sessionId, sessionSecret, token, isOutsideGeofence, distance, distanceFromCenter]);

  const movePosition = (dx: number, dy: number) => {
    setCarPosition(prev => ({
      x: Math.max(0, Math.min(100, prev.x + dx)),
      y: Math.max(0, Math.min(100, prev.y + dy)),
    }));
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full card-glow">
          <CardHeader className="text-center">
            <Car className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle className="font-display">Test Car Simulator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter Token (XXXX-XXXX-XXXX)"
                value={tokenCode}
                onChange={(e) => setTokenCode(e.target.value.toUpperCase())}
                className="token-input"
              />
            </div>
            <Button onClick={verifyToken} className="w-full" size="lg">
              <Key className="h-5 w-5 mr-2" /> Unlock Car
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-display font-bold">Test Car Simulator</h1>
          </div>
          {driving ? (
            <Button variant="destructive" onClick={stopDrive}><Square className="h-4 w-4 mr-2" /> Stop</Button>
          ) : (
            <Button onClick={startDrive}><Play className="h-4 w-4 mr-2" /> Start Drive</Button>
          )}
        </div>

        {/* Geofence Map */}
        <Card>
          <CardContent className="p-4">
            <div className="relative w-full aspect-square bg-secondary/30 rounded-xl overflow-hidden">
              {/* Geofence circle */}
              <div className="absolute inset-4 rounded-full border-2 border-dashed border-primary/50 geofence-pulse" />
              <div className="absolute inset-8 rounded-full border border-primary/30" />
              
              {/* Car position */}
              <div
                className={`absolute w-6 h-6 rounded-full transition-all duration-200 ${isOutsideGeofence ? 'bg-destructive shadow-glow-destructive' : 'bg-primary shadow-glow'}`}
                style={{ left: `${carPosition.x}%`, top: `${carPosition.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <Car className="h-4 w-4 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>

              {isOutsideGeofence && (
                <div className="absolute top-2 left-2 right-2 bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">GEOFENCE BREACH!</span>
                </div>
              )}
            </div>

            {/* Direction controls */}
            <div className="grid grid-cols-3 gap-2 mt-4 max-w-32 mx-auto">
              <div />
              <Button variant="secondary" size="sm" onClick={() => movePosition(0, -5)}>↑</Button>
              <div />
              <Button variant="secondary" size="sm" onClick={() => movePosition(-5, 0)}>←</Button>
              <Button variant="secondary" size="sm" onClick={() => setCarPosition({ x: 50, y: 50 })}>⊙</Button>
              <Button variant="secondary" size="sm" onClick={() => movePosition(5, 0)}>→</Button>
              <div />
              <Button variant="secondary" size="sm" onClick={() => movePosition(0, 5)}>↓</Button>
            </div>
          </CardContent>
        </Card>

        {/* Speed Control */}
        <Card className={speed[0] > token.speed_limit ? 'border-destructive/50' : ''}>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" /> Speed</span>
              <span className={`text-2xl font-display font-bold ${speed[0] > token.speed_limit ? 'text-destructive' : ''}`}>
                {speed[0]} / {token.speed_limit} km/h
              </span>
            </div>
            <Slider value={speed} onValueChange={setSpeed} min={0} max={150} step={5} disabled={!driving} />
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-display font-bold">{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</p>
              <p className="text-sm text-muted-foreground">/ {token.time_limit_minutes} mins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MapPin className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-display font-bold">{distance.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">/ {Number(token.distance_limit_km)} km</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
