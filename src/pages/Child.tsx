import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
 import { Shield, Gauge, Clock, MapPin, AlertTriangle, CheckCircle, Car, Fuel, ArrowRight, HandHelping } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DemoInstructions } from '@/components/DemoInstructions';

 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
 import { toast } from 'sonner';
 
// Validated token data from secure RPC function
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

export default function Child() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenCode = searchParams.get('token');
  const [token, setToken] = useState<ValidatedToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
   const [requestOpen, setRequestOpen] = useState(false);
   const [requestType, setRequestType] = useState('');
   const [requestedValue, setRequestedValue] = useState('');
   const [requestMessage, setRequestMessage] = useState('');

  useEffect(() => {
    if (tokenCode) {
      fetchToken();
    } else {
      setLoading(false);
      setError('No token provided');
    }
  }, [tokenCode]);

  const fetchToken = async () => {
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

  const goToSimulator = () => {
    navigate('/test-car');
  };
 
   const getCurrentValue = (type: string): number => {
     if (!token) return 0;
     switch (type) {
       case 'time': return token.time_limit_minutes;
       case 'distance': return Number(token.distance_limit_km);
       case 'speed': return token.speed_limit;
       case 'fuel': return token.fuel_limit_percent;
       case 'geofence': return Number(token.geofence_radius_km);
       default: return 0;
     }
   };
 
   const getUnit = (type: string): string => {
     switch (type) {
       case 'time': return 'minutes';
       case 'distance': return 'km';
       case 'speed': return 'km/h';
       case 'fuel': return '%';
       case 'geofence': return 'km';
       default: return '';
     }
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
            <h2 className="text-xl font-bold mb-2">Token Error</h2>
            <p className="text-muted-foreground">{error || 'Invalid token'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <DemoInstructions variant="guest" />
        <ThemeToggle />
      </div>
      
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <Shield className="h-10 w-10 text-primary mx-auto mb-2" />
          <h1 className="text-2xl font-bold">Welcome, {token.guest_name}</h1>
          <p className="text-muted-foreground">Your driving permissions</p>
          <p className="help-text mt-1">These limits are set by the vehicle owner</p>
        </div>

        {token.car_name !== 'Unassigned' && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Car className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{token.car_name}</p>
                <p className="text-sm text-muted-foreground">Assigned Vehicle</p>
              </div>
            </CardContent>
          </Card>
        )}

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
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <span className="flex items-center gap-2"><Fuel className="h-5 w-5 text-primary" /> Fuel Limit</span>
              <span className="font-bold">{token.fuel_limit_percent}%</span>
            </div>
          </CardContent>
        </Card>

       {/* Request Extension Card */}
       <Card className="bg-secondary/30">
         <CardContent className="p-4 space-y-3">
           <p className="text-sm text-muted-foreground">Need more time, distance, or other limits?</p>
           <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
             <DialogTrigger asChild>
               <Button variant="outline" className="w-full">
                 <HandHelping className="h-4 w-4 mr-2" />
                 Request Extension from Owner
               </Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-md">
               <DialogHeader>
                 <DialogTitle className="flex items-center gap-2">
                   <HandHelping className="h-5 w-5 text-primary" />
                   Request Extension
                 </DialogTitle>
               </DialogHeader>
               <div className="space-y-4">
                 <div className="space-y-2">
                   <Label>What do you need?</Label>
                   <Select value={requestType} onValueChange={setRequestType}>
                     <SelectTrigger>
                       <SelectValue placeholder="Select what you need" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="time"><span className="flex items-center gap-2"><Clock className="h-4 w-4" /> More Time</span></SelectItem>
                       <SelectItem value="distance"><span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> More Distance</span></SelectItem>
                       <SelectItem value="speed"><span className="flex items-center gap-2"><Gauge className="h-4 w-4" /> Higher Speed Limit</span></SelectItem>
                       <SelectItem value="fuel"><span className="flex items-center gap-2"><Fuel className="h-4 w-4" /> Higher Fuel Limit</span></SelectItem>
                       <SelectItem value="geofence"><span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Larger Geofence</span></SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
 
                 {requestType && (
                   <>
                     <div className="p-3 bg-secondary/50 rounded-lg text-sm">
                       <p className="text-muted-foreground">Current limit: <span className="font-medium text-foreground">{getCurrentValue(requestType)} {getUnit(requestType)}</span></p>
                     </div>
 
                     <div className="space-y-2">
                       <Label>Requested value ({getUnit(requestType)})</Label>
                       <Input
                         type="number"
                         placeholder={`Enter new ${getUnit(requestType)}`}
                         value={requestedValue}
                         onChange={(e) => setRequestedValue(e.target.value)}
                         min={getCurrentValue(requestType) + 1}
                       />
                     </div>
 
                     <div className="space-y-2">
                       <Label>Reason (optional)</Label>
                       <Textarea
                         placeholder="Why do you need this extension?"
                         value={requestMessage}
                         onChange={(e) => setRequestMessage(e.target.value)}
                         maxLength={200}
                         rows={2}
                       />
                     </div>
                   </>
                 )}
 
                 <p className="text-xs text-muted-foreground">
                   Note: You'll need to start a driving session first to send extension requests. Go to the simulator and start driving.
                 </p>
 
                 <Button variant="outline" onClick={() => setRequestOpen(false)} className="w-full">
                   Close
                 </Button>
               </div>
             </DialogContent>
           </Dialog>
         </CardContent>
       </Card>
 
        <Card className="bg-secondary/30">
          <CardContent className="p-4 space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Ready to drive? Go to the Car Simulator to start your session.
            </p>
            <Button onClick={goToSimulator} className="w-full" size="lg">
              Go to Car Simulator
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Use token code: <code className="bg-secondary px-2 py-1 rounded">{tokenCode}</code></p>
        </div>
      </div>
    </div>
  );
}
