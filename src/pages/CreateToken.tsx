import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Clock, Gauge, MapPin, Fuel, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { VoiceTokenCreator } from '@/components/VoiceTokenCreator';
import { SliderWithInput } from '@/components/SliderWithInput';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoIcon from '@/assets/logo-icon.png';

interface CarData {
  id: string;
  name: string;
  make: string | null;
  model: string | null;
}

export default function CreateToken() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [cars, setCars] = useState<CarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [selectedCarId, setSelectedCarId] = useState<string>('');
  const [speedLimit, setSpeedLimit] = useState([60]);
  const [timeLimit, setTimeLimit] = useState([30]);
  const [distanceLimit, setDistanceLimit] = useState([10]);
  const [geofenceRadius, setGeofenceRadius] = useState([5]);
  const [validityHours, setValidityHours] = useState([24]);
  const [fuelLimit, setFuelLimit] = useState([80]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchCars();
  }, [user, authLoading, navigate]);

  const fetchCars = async () => {
    if (!user) return;
    
    try {
      const { data: carsData } = await supabase
        .from('cars')
        .select('id, name, make, model')
        .eq('owner_id', user.id);
      
      setCars(carsData || []);
      if (carsData && carsData.length > 0) {
        setSelectedCarId(carsData[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch cars:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTokenCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 4; i++) result += chars[Math.floor(Math.random() * chars.length)];
    result += '-';
    for (let i = 0; i < 4; i++) result += chars[Math.floor(Math.random() * chars.length)];
    result += '-';
    for (let i = 0; i < 4; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  };

  const handleCreateToken = async () => {
    if (!user || !guestName.trim()) {
      toast.error('Please enter guest name');
      return;
    }

    setSubmitting(true);

    const tokenCode = generateTokenCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + validityHours[0]);

    const { error } = await supabase.from('driving_tokens').insert({
      master_user_id: user.id,
      token_code: tokenCode,
      guest_name: guestName,
      guest_phone: guestPhone || null,
      car_id: selectedCarId || null,
      speed_limit: speedLimit[0],
      time_limit_minutes: timeLimit[0],
      distance_limit_km: distanceLimit[0],
      geofence_radius_km: geofenceRadius[0],
      geofence_center_lat: 18.5204,
      geofence_center_lng: 73.8567,
      validity_hours: validityHours[0],
      fuel_limit_percent: fuelLimit[0],
      expires_at: expiresAt.toISOString()
    });

    setSubmitting(false);

    if (error) {
      toast.error('Failed to create token 😕');
    } else {
      toast.success('Token created! 🎉 Share it with your guest');
      navigate('/dashboard');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logoIcon} alt="AutoSentinel" className="h-9 w-9 rounded-lg object-cover" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-display font-bold">Create Token</h1>
              <p className="text-xs text-muted-foreground">Set limits for your guest</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <Card className="animate-in">
          <CardHeader className="pb-4">
            <CardTitle className="font-display flex items-center justify-between text-xl">
              Permission Token 🔑
              <VoiceTokenCreator 
                onTokenParsed={(params) => {
                  if (params.childName) setGuestName(params.childName);
                  if (params.speedLimit) setSpeedLimit([params.speedLimit]);
                  if (params.timeLimit) setTimeLimit([params.timeLimit]);
                  if (params.distanceLimit) setDistanceLimit([params.distanceLimit]);
                  if (params.geofenceRadius) setGeofenceRadius([params.geofenceRadius]);
                }}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Guest Name *</Label>
              <Input 
                placeholder="Who's driving?" 
                value={guestName} 
                onChange={(e) => setGuestName(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label>Phone (Optional)</Label>
              <Input 
                placeholder="+91 9876543210" 
                value={guestPhone} 
                onChange={(e) => setGuestPhone(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label>Assign Vehicle</Label>
              <Select value={selectedCarId} onValueChange={setSelectedCarId}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  {cars.map(car => (
                    <SelectItem key={car.id} value={car.id}>{car.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cars.length === 0 && (
                <p className="text-xs text-muted-foreground">Add a vehicle from the dashboard first</p>
              )}
            </div>

            <div className="space-y-4 pt-2">
              <SliderWithInput 
                label="Token Valid For" 
                icon={<Clock className="h-4 w-4 text-primary" />} 
                value={validityHours} 
                onChange={setValidityHours} 
                min={1} 
                max={72} 
                step={1} 
                unit="hours" 
              />
              
              <SliderWithInput 
                label="Speed Limit" 
                icon={<Gauge className="h-4 w-4 text-primary" />} 
                value={speedLimit} 
                onChange={setSpeedLimit} 
                min={0} 
                max={120} 
                step={5} 
                unit="km/h" 
              />
              
              <SliderWithInput 
                label="Driving Time" 
                icon={<Clock className="h-4 w-4 text-primary" />} 
                value={timeLimit} 
                onChange={setTimeLimit} 
                min={0} 
                max={180} 
                step={5} 
                unit="mins" 
              />
              
              <SliderWithInput 
                label="Distance" 
                icon={<MapPin className="h-4 w-4 text-primary" />} 
                value={distanceLimit} 
                onChange={setDistanceLimit} 
                min={0} 
                max={50} 
                step={1} 
                unit="km" 
              />
              
              <SliderWithInput 
                label="Fuel Limit" 
                icon={<Fuel className="h-4 w-4 text-primary" />} 
                value={fuelLimit} 
                onChange={setFuelLimit} 
                min={0} 
                max={100} 
                step={5} 
                unit="%" 
              />
              
              <SliderWithInput 
                label="Geofence" 
                icon={<MapPin className="h-4 w-4 text-primary" />} 
                value={geofenceRadius} 
                onChange={setGeofenceRadius} 
                min={0} 
                max={20} 
                step={0.5} 
                unit="km" 
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')} 
                className="flex-1 py-6 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateToken} 
                className="flex-1 py-6 text-base rounded-xl" 
                size="lg"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Generate Token 🚀'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
