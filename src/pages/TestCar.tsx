import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Car, Gauge, Clock, MapPin, AlertTriangle, Play, Square, Key, Fuel, OctagonX, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SeatBeltScreen } from '@/components/SeatBeltScreen';
import { GuestActions } from '@/components/GuestActions';
import { DemoInstructions } from '@/components/DemoInstructions';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { InactivityOverlay } from '@/components/InactivityOverlay';
import { SessionFeedbackScreen } from '@/components/SessionFeedbackScreen';

// Validated token data from RPC function
interface ValidatedToken {
  token_id: string;
  is_valid: boolean;
  speed_limit: number;
  time_limit_minutes: number;
  distance_limit_km: number;
  geofence_center_lat: number;
  geofence_center_lng: number;
  geofence_radius_km: number;
  guest_name: string;
  car_name: string;
  fuel_limit_percent: number;
}

export default function TestCar() {
  const [tokenCode, setTokenCode] = useState('');
  const [token, setToken] = useState<ValidatedToken | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionSecret, setSessionSecret] = useState<string | null>(null);
  const [driving, setDriving] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState([0]);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [carPosition, setCarPosition] = useState({ x: 50, y: 50 });
  const [showSeatBeltDialog, setShowSeatBeltDialog] = useState(false);
  const [seatBeltConfirmed, setSeatBeltConfirmed] = useState(false);
  const [tokenReturned, setTokenReturned] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAlertRef = useRef<{ speed: number; geofence: number; fuel: number; distance: number }>({ 
    speed: 0, geofence: 0, fuel: 0, distance: 0 
  });
  
  const { saveSession, restoreSession, clearSession } = useSessionPersistence(tokenCode);

  const geofenceRadius = token ? Number(token.geofence_radius_km) : 5;
  const distanceFromCenter = Math.sqrt(Math.pow(carPosition.x - 50, 2) + Math.pow(carPosition.y - 50, 2)) / 40 * geofenceRadius;
  const isOutsideGeofence = distanceFromCenter > geofenceRadius;

  // Restore session on mount
  useEffect(() => {
    if (token && tokenCode) {
      const savedSession = restoreSession();
      if (savedSession && savedSession.sessionId && savedSession.sessionSecret) {
        setSessionId(savedSession.sessionId);
        setSessionSecret(savedSession.sessionSecret);
        setDriving(savedSession.driving);
        setIsPaused(savedSession.isPaused || false);
        setSpeed([savedSession.speed]);
        setDistance(savedSession.distance);
        setElapsed(savedSession.elapsed);
        setFuel(savedSession.fuel);
        setCarPosition(savedSession.carPosition);
        setSeatBeltConfirmed(savedSession.seatBeltConfirmed);
        
        if (savedSession.isPaused) {
          toast.info('Session restored - Resume driving when ready');
        }
      }
    }
  }, [token, tokenCode]);

  // Save session state periodically
  useEffect(() => {
    if (driving && sessionId) {
      saveSession({
        sessionId,
        sessionSecret,
        driving,
        isPaused,
        speed: speed[0],
        distance,
        elapsed,
        fuel,
        carPosition,
        seatBeltConfirmed
      });
    }
  }, [driving, speed, distance, elapsed, fuel, carPosition, sessionId]);

  const verifyToken = async () => {
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

  const initiateStartDrive = () => {
    setShowSeatBeltDialog(true);
  };

  const confirmSeatBeltAndStart = async () => {
    setSeatBeltConfirmed(true);
    setShowSeatBeltDialog(false);
    
    if (!token) return;

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
    
    // Confirm seat belt in database
    await supabase.rpc('confirm_seat_belt', {
      p_session_id: result.session_id,
      p_session_secret: result.session_secret
    });
    
    setDriving(true);
    setIsPaused(false);
    toast.success('Drive started! Stay safe.');
  };

  const resumeDrive = () => {
    setIsPaused(false);
    setDriving(true);
    toast.success('Drive resumed!');
  };

  const pauseDrive = () => {
    setIsPaused(true);
    toast.info('Drive paused - your progress is saved');
  };

  const stopDrive = async () => {
    if (!sessionId || !sessionSecret) return;

    const { data } = await supabase.rpc('stop_driving_session', {
      p_session_id: sessionId,
      p_session_secret: sessionSecret
    });

    if (data) {
      setDriving(false);
      setIsPaused(false);
      clearSession();
      setSessionEnded(true);
      setShowFeedback(true);
      toast.success('Drive ended!');
    } else {
      toast.error('Failed to end session');
    }
  };

  const handleInactivityAlert = async () => {
    if (!sessionId || !sessionSecret) return;
    await supabase.rpc('create_session_alert', {
      p_session_id: sessionId,
      p_session_secret: sessionSecret,
      p_message: '⚠️ Guest is inactive for 2+ minutes'
    });
    toast.warning('Owner has been notified of your inactivity');
  };

  const handleFeedbackSubmit = (feedback: { emoji: string; comment: string }) => {
    toast.success(`Thanks for your feedback! ${feedback.emoji}`);
    setShowFeedback(false);
  };

  const simulateSuddenStop = async () => {
    if (!sessionId || !sessionSecret) return;
    
    toast.warning('SUDDEN STOP DETECTED!');
    
    await supabase.rpc('update_session_telemetry', {
      p_session_id: sessionId,
      p_session_secret: sessionSecret,
      p_speed: 0,
      p_distance_km: distance,
      p_fuel_percent: fuel,
      p_sudden_stop: true
    });

    await supabase.rpc('create_session_alert', {
      p_session_id: sessionId,
      p_session_secret: sessionSecret,
      p_message: `⚠️ SUDDEN STOP detected at ${speed[0]} km/h - Possible accident!`
    });

    setSpeed([0]);
  };

  useEffect(() => {
    if (driving && !isPaused && sessionId && sessionSecret && token) {
      intervalRef.current = setInterval(async () => {
        setElapsed(prev => prev + 1);
        const newDistance = distance + (speed[0] / 3600);
        setDistance(newDistance);
        
        // Simulate fuel consumption based on speed
        const fuelConsumption = 0.005 + (speed[0] / 10000);
        const newFuel = Math.max(0, fuel - fuelConsumption);
        setFuel(newFuel);

        const { data } = await supabase.rpc('update_session_telemetry', {
          p_session_id: sessionId,
          p_session_secret: sessionSecret,
          p_speed: speed[0],
          p_distance_km: newDistance,
          p_fuel_percent: Math.round(newFuel),
          p_sudden_stop: false
        });

        const result = data?.[0];
        const now = Date.now();
        const THROTTLE_INTERVAL = 15000; // 15 seconds throttle
        
        // Speed violation alert - throttled
        if (result?.speed_violation && now - lastAlertRef.current.speed > THROTTLE_INTERVAL) {
          await supabase.rpc('create_session_alert', {
            p_session_id: sessionId,
            p_session_secret: sessionSecret,
            p_message: `Speed violation: ${speed[0]} km/h (limit: ${token.speed_limit} km/h)`
          });
          lastAlertRef.current.speed = now;
          toast.error(`Speed limit exceeded! Reduce to ${token.speed_limit} km/h`);
        }

        // Geofence breach alert - throttled
        if (isOutsideGeofence && now - lastAlertRef.current.geofence > THROTTLE_INTERVAL) {
          await supabase.rpc('create_session_alert', {
            p_session_id: sessionId,
            p_session_secret: sessionSecret,
            p_message: `Geofence breach: Vehicle is ${distanceFromCenter.toFixed(1)} km from center`
          });
          lastAlertRef.current.geofence = now;
          toast.error('Return to geofence area!');
        }

        // Distance limit alert - throttled
        if (newDistance > Number(token.distance_limit_km) && now - lastAlertRef.current.distance > THROTTLE_INTERVAL) {
          await supabase.rpc('create_session_alert', {
            p_session_id: sessionId,
            p_session_secret: sessionSecret,
            p_message: `Distance limit exceeded: ${newDistance.toFixed(1)} km (limit: ${token.distance_limit_km} km)`
          });
          lastAlertRef.current.distance = now;
          toast.error('Distance limit exceeded!');
        }

        // Low fuel alert - throttled (longer interval)
        if (newFuel < 20 && now - lastAlertRef.current.fuel > 30000) {
          await supabase.rpc('create_session_alert', {
            p_session_id: sessionId,
            p_session_secret: sessionSecret,
            p_message: `⛽ Low fuel warning: ${Math.round(newFuel)}% remaining`
          });
          lastAlertRef.current.fuel = now;
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [driving, isPaused, speed, sessionId, sessionSecret, token, isOutsideGeofence, distance, distanceFromCenter, fuel]);

  const movePosition = (dx: number, dy: number) => {
    setCarPosition(prev => ({
      x: Math.max(0, Math.min(100, prev.x + dx)),
      y: Math.max(0, Math.min(100, prev.y + dy)),
    }));
  };

  if (tokenReturned) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center animate-in">
          <CardContent className="py-12">
            <Car className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Token Returned</h2>
            <p className="text-muted-foreground mb-4">You have returned this token to the owner.</p>
            <Button onClick={() => window.location.reload()}>Use Another Token</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <DemoInstructions variant="simulator" />
          <ThemeToggle />
        </div>
        <Card className="max-w-md w-full card-glow animate-in">
          <CardHeader className="text-center">
            <Car className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Car Simulator</CardTitle>
            <p className="help-text mt-2">Virtual driving environment for testing tokens</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-secondary rounded-lg text-sm">
              <p className="font-medium mb-2">How to use:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Get a token code from the vehicle owner</li>
                <li>Enter the code below to unlock the car</li>
                <li>Confirm seat belt and start driving</li>
                <li>Stay within speed, distance, and geofence limits</li>
              </ol>
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Enter Token (XXXX-XXXX-XXXX)"
                value={tokenCode}
                onChange={(e) => setTokenCode(e.target.value.toUpperCase())}
                className="token-input"
              />
              <p className="help-text">Enter the token code shared by the vehicle owner</p>
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
      {/* Seat Belt Screen */}
      {showSeatBeltDialog && (
        <SeatBeltScreen 
          onConfirm={confirmSeatBeltAndStart}
          guestName={token.guest_name}
          carName={token.car_name}
        />
      )}

      {/* Inactivity Overlay */}
      <InactivityOverlay 
        isActive={driving && !isPaused}
        onInactivityAlert={handleInactivityAlert}
        timeoutMs={120000}
      />

      {/* Session Feedback Screen */}
      {showFeedback && (
        <SessionFeedbackScreen 
          onClose={() => setShowFeedback(false)}
          onSubmit={handleFeedbackSubmit}
          vehicleName={token.car_name}
        />
      )}

      <div className="absolute top-4 right-4 flex items-center gap-2">
        <DemoInstructions variant="simulator" />
        <ThemeToggle />
      </div>
      
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Car className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Car Simulator</h1>
              <p className="text-sm text-muted-foreground">
                {token.car_name !== 'Unassigned' ? token.car_name : 'Simulated Vehicle'} • Guest: {token.guest_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPaused && (
              <span className="px-2 py-1 bg-warning/20 text-warning text-xs rounded-full flex items-center gap-1">
                <Pause className="h-3 w-3" /> Paused
              </span>
            )}
            {driving && !isPaused ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={pauseDrive}>
                  <Pause className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={stopDrive}>
                  <Square className="h-4 w-4 mr-1" /> Stop
                </Button>
              </div>
            ) : isPaused ? (
              <div className="flex gap-2">
                <Button onClick={resumeDrive} size="sm">
                  <Play className="h-4 w-4 mr-1" /> Resume
                </Button>
                <Button variant="destructive" size="sm" onClick={stopDrive}>
                  <Square className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={initiateStartDrive} disabled={seatBeltConfirmed && driving}>
                <Play className="h-4 w-4 mr-2" /> Start Drive
              </Button>
            )}
          </div>
        </div>

        {/* Guest Actions */}
        {(driving || isPaused) && sessionSecret && (
          <Card className="bg-secondary/30 animate-in">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2">Guest Actions</p>
              <GuestActions 
                tokenCode={tokenCode}
                sessionSecret={sessionSecret}
                guestName={token.guest_name}
                tokenId={token.token_id}
                onTokenReturned={() => setTokenReturned(true)}
             currentLimits={{
               time_limit_minutes: token.time_limit_minutes,
               distance_limit_km: Number(token.distance_limit_km),
               speed_limit: token.speed_limit,
               fuel_limit_percent: token.fuel_limit_percent,
               geofence_radius_km: Number(token.geofence_radius_km)
             }}
              />
            </CardContent>
          </Card>
        )}

        {/* Geofence Map */}
        <Card className="animate-in stagger-1">
          <CardContent className="p-4">
            <p className="help-text mb-2">Geofence boundary - stay inside the dashed circle</p>
            <div className="relative w-full aspect-square bg-secondary/30 rounded-xl overflow-hidden">
              <div className="absolute inset-4 rounded-full border-2 border-dashed border-primary/50 geofence-pulse" />
              <div className="absolute inset-8 rounded-full border border-primary/30" />
              
              <div
                className={`absolute w-6 h-6 rounded-full transition-all duration-200 ${isOutsideGeofence ? 'bg-destructive shadow-glow-destructive' : 'bg-primary shadow-glow'}`}
                style={{ left: `${carPosition.x}%`, top: `${carPosition.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <Car className="h-4 w-4 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>

              {isOutsideGeofence && (
                <div className="absolute top-2 left-2 right-2 bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-lg flex items-center gap-2 animate-shake">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">GEOFENCE BREACH!</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 max-w-32 mx-auto">
              <div />
              <Button variant="secondary" size="sm" onClick={() => movePosition(0, -5)} disabled={!driving || isPaused}>↑</Button>
              <div />
              <Button variant="secondary" size="sm" onClick={() => movePosition(-5, 0)} disabled={!driving || isPaused}>←</Button>
              <Button variant="secondary" size="sm" onClick={() => setCarPosition({ x: 50, y: 50 })} disabled={!driving || isPaused}>⊙</Button>
              <Button variant="secondary" size="sm" onClick={() => movePosition(5, 0)} disabled={!driving || isPaused}>→</Button>
              <div />
              <Button variant="secondary" size="sm" onClick={() => movePosition(0, 5)} disabled={!driving || isPaused}>↓</Button>
            </div>
          </CardContent>
        </Card>

        {/* Speed Control */}
        <Card className={`animate-in stagger-2 ${speed[0] > token.speed_limit ? 'border-destructive/50' : ''}`}>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" /> Speed</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={speed[0]}
                  onChange={(e) => setSpeed([Math.max(0, Math.min(150, parseInt(e.target.value) || 0))])}
                  className="w-20 h-8 text-center"
                  disabled={!driving || isPaused}
                  min={0}
                  max={150}
                />
                <span className={`text-lg font-display font-bold ${speed[0] > token.speed_limit ? 'text-destructive' : ''}`}>
                  / {token.speed_limit} km/h
                </span>
              </div>
            </div>
            <Slider value={speed} onValueChange={setSpeed} min={0} max={150} step={5} disabled={!driving || isPaused} />
            
            {(driving || isPaused) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={simulateSuddenStop}
                disabled={isPaused}
                className="w-full border-warning text-warning hover:bg-warning/10"
              >
                <OctagonX className="h-4 w-4 mr-2" />
                Simulate Sudden Stop (Accident)
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 animate-in stagger-3">
          <Card className={elapsed / 60 > token.time_limit_minutes ? 'border-destructive/50' : ''}>
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-display font-bold">{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</p>
              <p className="text-xs text-muted-foreground">/ {token.time_limit_minutes} mins</p>
            </CardContent>
          </Card>
          <Card className={distance > Number(token.distance_limit_km) ? 'border-destructive/50' : ''}>
            <CardContent className="p-3 text-center">
              <MapPin className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-display font-bold">{distance.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">/ {Number(token.distance_limit_km)} km</p>
            </CardContent>
          </Card>
          <Card className={fuel < 20 ? 'border-warning' : ''}>
            <CardContent className="p-3 text-center">
              <Fuel className={`h-5 w-5 mx-auto mb-1 ${fuel < 20 ? 'text-warning' : 'text-primary'}`} />
              <p className={`text-xl font-display font-bold ${fuel < 20 ? 'text-warning' : ''}`}>{Math.round(fuel)}%</p>
              <p className="text-xs text-muted-foreground">Fuel</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}