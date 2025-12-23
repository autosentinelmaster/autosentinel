import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, Plus, LogOut, Car, Activity, AlertTriangle, 
  Clock, Gauge, MapPin, CheckCircle, Bell, Fuel, Undo2
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Database } from '@/integrations/supabase/types';
import { VoiceTokenCreator } from '@/components/VoiceTokenCreator';
import { SessionSummary } from '@/components/SessionSummary';
import { TokenShareMenu } from '@/components/TokenShareMenu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CarManager } from '@/components/CarManager';
import { MessageCenter } from '@/components/MessageCenter';
import { SOSAlert } from '@/components/SOSAlert';
import { DemoInstructions } from '@/components/DemoInstructions';

type DrivingToken = Database['public']['Tables']['driving_tokens']['Row'];
type DrivingSession = Database['public']['Tables']['driving_sessions']['Row'];
type Alert = Database['public']['Tables']['alerts']['Row'];

interface CarData {
  id: string;
  name: string;
  make: string | null;
  model: string | null;
}

interface Message {
  id: string;
  token_id: string;
  sender_type: string;
  message: string;
  is_sos: boolean;
  is_read: boolean;
  created_at: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<DrivingToken[]>([]);
  const [sessions, setSessions] = useState<DrivingSession[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [cars, setCars] = useState<CarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // SOS Alert state
  const [sosAlert, setSosAlert] = useState<{ open: boolean; guestName: string; message: string; carName?: string }>({
    open: false, guestName: '', message: ''
  });
  
  // New token form state
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
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
  }, [user, navigate]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch cars
      const { data: carsData } = await supabase
        .from('cars')
        .select('id, name, make, model')
        .eq('owner_id', user.id);
      
      setCars(carsData || []);

      // Fetch tokens
      const { data: tokensData } = await supabase
        .from('driving_tokens')
        .select('*')
        .eq('master_user_id', user.id)
        .order('created_at', { ascending: false });

      setTokens(tokensData || []);

      // Fetch sessions for these tokens
      if (tokensData && tokensData.length > 0) {
        const tokenIds = tokensData.map(t => t.id);
        const { data: sessionsData } = await supabase
          .from('driving_sessions')
          .select('*')
          .in('token_id', tokenIds)
          .order('created_at', { ascending: false });

        setSessions(sessionsData || []);

        // Fetch alerts
        const { data: alertsData } = await supabase
          .from('alerts')
          .select('*')
          .in('token_id', tokenIds)
          .order('created_at', { ascending: false })
          .limit(10);

        setAlerts(alertsData || []);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const sessionsChannel = supabase
      .channel('sessions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driving_sessions' }, () => {
        fetchData();
      })
      .subscribe();

    const alertsChannel = supabase
      .channel('alerts-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        const newAlert = payload.new as Alert;
        setAlerts(prev => [newAlert, ...prev.slice(0, 9)]);
        toast.error(newAlert.message, {
          icon: <AlertTriangle className="h-5 w-5 text-destructive" />
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(alertsChannel);
    };
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

    const tokenCode = generateTokenCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + validityHours[0]);

    const { data, error } = await supabase.from('driving_tokens').insert({
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
    }).select().single();

    if (error) {
      toast.error('Failed to create token');
      if (import.meta.env.DEV) console.error(error);
    } else {
      toast.success('Token created successfully!');
      setTokens(prev => [data, ...prev]);
      setCreateDialogOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setGuestName('');
    setGuestPhone('');
    setSelectedCarId('');
    setSpeedLimit([60]);
    setTimeLimit([30]);
    setDistanceLimit([10]);
    setGeofenceRadius([5]);
    setValidityHours([24]);
    setFuelLimit([80]);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const getTokenStatus = (token: DrivingToken) => {
    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    if (token.is_returned) return 'returned';
    if (expiresAt < now) return 'expired';
    if (token.is_active) return 'active';
    if (token.is_used) return 'used';
    return 'pending';
  };

  const getCarName = (carId: string | null) => {
    if (!carId) return null;
    const car = cars.find(c => c.id === carId);
    return car ? car.name : null;
  };

  const handleSOSReceived = (tokenId: string, message: Message) => {
    const token = tokens.find(t => t.id === tokenId);
    if (token) {
      setSosAlert({
        open: true,
        guestName: token.guest_name,
        message: message.message,
        carName: getCarName(token.car_id) || undefined
      });
    }
  };

  const activeSessionsCount = sessions.filter(s => s.status === 'active').length;
  const totalViolations = sessions.reduce((sum, s) => sum + s.total_violations, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary animate-pulse" />
          <span className="text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* SOS Alert Modal */}
      <SOSAlert 
        open={sosAlert.open}
        onClose={() => setSosAlert(prev => ({ ...prev, open: false }))}
        guestName={sosAlert.guestName}
        message={sosAlert.message}
        carName={sosAlert.carName}
      />

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-display font-bold">Auto Sentinel</h1>
              <p className="text-xs text-muted-foreground">Owner Control Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DemoInstructions variant="owner" />
            <ThemeToggle />
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Overview */}
        <p className="help-text">Quick overview of your vehicle access management</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Tokens</p>
                  <p className="text-3xl font-display font-bold">{tokens.filter(t => getTokenStatus(t) === 'pending' || getTokenStatus(t) === 'active').length}</p>
                </div>
                <Car className="h-10 w-10 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Sessions</p>
                  <p className="text-3xl font-display font-bold">{activeSessionsCount}</p>
                </div>
                <Activity className="h-10 w-10 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/10 to-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">My Vehicles</p>
                  <p className="text-3xl font-display font-bold">{cars.length}</p>
                </div>
                <Clock className="h-10 w-10 text-warning opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${totalViolations > 0 ? 'from-destructive/10' : 'from-muted/10'} to-card`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Violations</p>
                  <p className="text-3xl font-display font-bold">{totalViolations}</p>
                </div>
                <AlertTriangle className={`h-10 w-10 ${totalViolations > 0 ? 'text-destructive' : 'text-muted-foreground'} opacity-50`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Car Manager */}
        <CarManager onCarsChange={(newCars) => setCars(newCars)} />

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-destructive" />
                Recent Alerts
                <span className="help-text font-normal ml-2">Real-time violation notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div 
                  key={alert.id} 
                  className={`flex items-center gap-3 p-3 rounded-lg bg-destructive/10 ${!alert.is_read ? 'pulse-alert' : ''}`}
                >
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Create Token Button */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full">
              <Plus className="h-5 w-5 mr-2" />
              Create New Driving Token
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center justify-between">
                Create Driving Permission
                <VoiceTokenCreator 
                  onTokenParsed={(params) => {
                    if (params.childName) setGuestName(params.childName);
                    if (params.speedLimit) setSpeedLimit([params.speedLimit]);
                    if (params.timeLimit) setTimeLimit([params.timeLimit]);
                    if (params.distanceLimit) setDistanceLimit([params.distanceLimit]);
                    if (params.geofenceRadius) setGeofenceRadius([params.geofenceRadius]);
                  }}
                />
              </DialogTitle>
              <DialogDescription>
                Set driving restrictions and generate a shareable token for vehicle access.
              </DialogDescription>
            </DialogHeader>
            <p className="help-text">Configure vehicle, limits, and token validity</p>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="guestName">Guest Name *</Label>
                <Input
                  id="guestName"
                  placeholder="Enter guest name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guestPhone">Guest Phone (Optional)</Label>
                <Input
                  id="guestPhone"
                  placeholder="+91 9876543210"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Assign Vehicle</Label>
                <Select value={selectedCarId} onValueChange={setSelectedCarId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vehicle (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {cars.map(car => (
                      <SelectItem key={car.id} value={car.id}>
                        {car.name} {car.make && car.model ? `(${car.make} ${car.model})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {cars.length === 0 && (
                  <p className="text-xs text-muted-foreground">Add vehicles in "My Vehicles" section first</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Token Validity
                  </Label>
                  <span className="text-sm font-semibold text-primary">{validityHours[0]} hours</span>
                </div>
                <Slider
                  value={validityHours}
                  onValueChange={setValidityHours}
                  min={1}
                  max={72}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">How long the token can be used (not driving time)</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-primary" />
                    Speed Limit
                  </Label>
                  <span className="text-sm font-semibold text-primary">{speedLimit[0]} km/h</span>
                </div>
                <Slider
                  value={speedLimit}
                  onValueChange={setSpeedLimit}
                  min={20}
                  max={120}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Driving Time Limit
                  </Label>
                  <span className="text-sm font-semibold text-primary">{timeLimit[0]} mins</span>
                </div>
                <Slider
                  value={timeLimit}
                  onValueChange={setTimeLimit}
                  min={10}
                  max={180}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Distance Limit
                  </Label>
                  <span className="text-sm font-semibold text-primary">{distanceLimit[0]} km</span>
                </div>
                <Slider
                  value={distanceLimit}
                  onValueChange={setDistanceLimit}
                  min={1}
                  max={50}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-primary" />
                    Fuel Usage Limit
                  </Label>
                  <span className="text-sm font-semibold text-primary">{fuelLimit[0]}%</span>
                </div>
                <Slider
                  value={fuelLimit}
                  onValueChange={setFuelLimit}
                  min={10}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Geofence Radius
                  </Label>
                  <span className="text-sm font-semibold text-primary">{geofenceRadius[0]} km</span>
                </div>
                <Slider
                  value={geofenceRadius}
                  onValueChange={setGeofenceRadius}
                  min={1}
                  max={20}
                  step={0.5}
                  className="w-full"
                />
              </div>

              <Button onClick={handleCreateToken} className="w-full" size="lg">
                Generate Token
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Tokens List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              Driving Tokens
            </h2>
            <span className="help-text">Manage access permissions for guests</span>
          </div>

          {tokens.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No tokens created yet</p>
                <p className="text-sm text-muted-foreground">Create a token to grant driving access</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => {
                const status = getTokenStatus(token);
                const session = sessions.find(s => s.token_id === token.id);
                const carName = getCarName(token.car_id);
                
                return (
                  <Card key={token.id} className={`transition-all ${status === 'active' ? 'card-glow border-primary/50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display font-semibold text-lg">{token.guest_name}</span>
                            {carName && (
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                                <Car className="h-3 w-3" /> {carName}
                              </span>
                            )}
                            {status === 'active' && (
                              <span className="px-2 py-0.5 rounded-full bg-success/20 text-success text-xs font-medium flex items-center gap-1">
                                <Activity className="h-3 w-3" /> Active
                              </span>
                            )}
                            {status === 'pending' && (
                              <span className="px-2 py-0.5 rounded-full bg-warning/20 text-warning text-xs font-medium">
                                Pending
                              </span>
                            )}
                            {status === 'expired' && (
                              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                                Expired
                              </span>
                            )}
                            {status === 'used' && (
                              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Completed
                              </span>
                            )}
                            {status === 'returned' && (
                              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium flex items-center gap-1">
                                <Undo2 className="h-3 w-3" /> Returned
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <code className="bg-secondary px-3 py-1.5 rounded-lg font-mono text-lg tracking-widest">
                              {token.token_code}
                            </code>
                            <TokenShareMenu 
                              tokenCode={token.token_code} 
                              childName={token.guest_name}
                            />
                            <MessageCenter 
                              tokenId={token.id} 
                              guestName={token.guest_name}
                              onSOSReceived={(msg) => handleSOSReceived(token.id, msg)}
                            />
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Gauge className="h-4 w-4" /> {token.speed_limit} km/h
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" /> {token.time_limit_minutes} mins
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" /> {Number(token.distance_limit_km)} km
                            </span>
                            <span className="flex items-center gap-1">
                              <Fuel className="h-4 w-4" /> {token.fuel_limit_percent}%
                            </span>
                          </div>

                          {session && (
                            <div className="mt-3 p-3 bg-secondary/50 rounded-lg">
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Speed</p>
                                  <p className={`font-semibold ${session.current_speed > token.speed_limit ? 'text-destructive' : 'text-foreground'}`}>
                                    {session.current_speed} km/h
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Distance</p>
                                  <p className="font-semibold">{Number(session.current_distance_km).toFixed(1)} km</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Fuel</p>
                                  <p className={`font-semibold ${session.current_fuel_percent < 20 ? 'text-warning' : ''}`}>
                                    {session.current_fuel_percent}%
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Violations</p>
                                  <p className={`font-semibold ${session.total_violations > 0 ? 'text-destructive' : 'text-success'}`}>
                                    {session.total_violations}
                                  </p>
                                </div>
                              </div>
                              {session.sudden_stops_count > 0 && (
                                <div className="mt-2 p-2 bg-warning/20 rounded text-warning text-sm flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4" />
                                  {session.sudden_stops_count} sudden stop(s) detected (potential accidents)
                                </div>
                              )}
                              <SessionSummary session={session} token={token} />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
