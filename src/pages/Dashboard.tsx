import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, Plus, LogOut, Car, Activity, AlertTriangle, 
  Clock, Gauge, MapPin, CheckCircle, Bell, Fuel, Undo2, Archive, XCircle, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { Database } from '@/integrations/supabase/types';
import { VoiceTokenCreator } from '@/components/VoiceTokenCreator';
import { SessionSummary } from '@/components/SessionSummary';
import { TokenShareMenu } from '@/components/TokenShareMenu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CarManager } from '@/components/CarManager';
import { MessageCenter } from '@/components/MessageCenter';
import { SOSAlert } from '@/components/SOSAlert';
import { DemoInstructions } from '@/components/DemoInstructions';
import { SliderWithInput } from '@/components/SliderWithInput';

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
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<DrivingToken[]>([]);
  const [sessions, setSessions] = useState<DrivingSession[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [cars, setCars] = useState<CarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tokenTab, setTokenTab] = useState('active');
  
  // SOS Alert state
  const [sosAlert, setSosAlert] = useState<{ open: boolean; guestName: string; message: string; carName?: string }>({
    open: false, guestName: '', message: ''
  });
  
  // New token form state
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [selectedCarId, setSelectedCarId] = useState<string>('');
  const [speedLimit, setSpeedLimit] = useState([0]);
  const [timeLimit, setTimeLimit] = useState([0]);
  const [distanceLimit, setDistanceLimit] = useState([0]);
  const [geofenceRadius, setGeofenceRadius] = useState([0]);
  const [validityHours, setValidityHours] = useState([24]);
  const [fuelLimit, setFuelLimit] = useState([80]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
  }, [user, authLoading, navigate]);

  // Set default car when cars load
  useEffect(() => {
    if (cars.length > 0 && !selectedCarId) {
      setSelectedCarId(cars[0].id);
    }
  }, [cars]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      const { data: carsData } = await supabase
        .from('cars')
        .select('id, name, make, model')
        .eq('owner_id', user.id);
      
      setCars(carsData || []);

      const { data: tokensData } = await supabase
        .from('driving_tokens')
        .select('*')
        .eq('master_user_id', user.id)
        .order('created_at', { ascending: false });

      setTokens(tokensData || []);

      if (tokensData && tokensData.length > 0) {
        const tokenIds = tokensData.map(t => t.id);
        const { data: sessionsData } = await supabase
          .from('driving_sessions')
          .select('*')
          .in('token_id', tokenIds)
          .order('created_at', { ascending: false });

        setSessions(sessionsData || []);

        const { data: alertsData } = await supabase
          .from('alerts')
          .select('*')
          .in('token_id', tokenIds)
          .order('created_at', { ascending: false })
          .limit(10);

        setAlerts(alertsData || []);
      }
    } catch (error) {
      // Silent error handling
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

    // Listen for SOS messages
    const messagesChannel = supabase
      .channel('sos-messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages'
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.is_sos) {
          const token = tokens.find(t => t.id === msg.token_id);
          if (token) {
            setSosAlert({
              open: true,
              guestName: token.guest_name,
              message: msg.message,
              carName: getCarName(token.car_id) || undefined
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(messagesChannel);
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
    } else {
      toast.success('Token created successfully!');
      setTokens(prev => [data, ...prev]);
      setCreateDialogOpen(false);
      resetForm();
    }
  };

  const handleExpireToken = async (tokenId: string) => {
    const { error } = await supabase
      .from('driving_tokens')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', tokenId);

    if (error) {
      toast.error('Failed to expire token');
    } else {
      toast.success('Token expired successfully');
      fetchData();
    }
  };

  const resetForm = () => {
    setGuestName('');
    setGuestPhone('');
    setSelectedCarId(cars.length > 0 ? cars[0].id : '');
    setSpeedLimit([0]);
    setTimeLimit([0]);
    setDistanceLimit([0]);
    setGeofenceRadius([0]);
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
    return car ? car.name : '(Deleted Vehicle)';
  };

  const activeTokens = tokens.filter(t => ['pending', 'active'].includes(getTokenStatus(t)));
  const archivedTokens = tokens.filter(t => ['expired', 'used', 'returned'].includes(getTokenStatus(t)));
  const activeSessionsCount = sessions.filter(s => s.status === 'active').length;
  const totalViolations = sessions.reduce((sum, s) => sum + s.total_violations, 0);

  if (loading || authLoading) {
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
      <SOSAlert 
        open={sosAlert.open}
        onClose={() => setSosAlert(prev => ({ ...prev, open: false }))}
        guestName={sosAlert.guestName}
        message={sosAlert.message}
        carName={sosAlert.carName}
      />

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
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="animate-in">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Active Tokens</p>
                  <p className="text-2xl sm:text-3xl font-display font-bold">{activeTokens.length}</p>
                </div>
                <Car className="h-8 w-8 sm:h-10 sm:w-10 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="animate-in stagger-1">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Active Sessions</p>
                  <p className="text-2xl sm:text-3xl font-display font-bold">{activeSessionsCount}</p>
                </div>
                <Activity className="h-8 w-8 sm:h-10 sm:w-10 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="animate-in stagger-2">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">My Vehicles</p>
                  <p className="text-2xl sm:text-3xl font-display font-bold">{cars.length}</p>
                </div>
                <Car className="h-8 w-8 sm:h-10 sm:w-10 text-warning opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className={`animate-in stagger-3 ${totalViolations > 0 ? 'border-destructive/50' : ''}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Violations</p>
                  <p className="text-2xl sm:text-3xl font-display font-bold">{totalViolations}</p>
                </div>
                <AlertTriangle className={`h-8 w-8 sm:h-10 sm:w-10 ${totalViolations > 0 ? 'text-destructive' : 'text-muted-foreground'} opacity-50`} />
              </div>
            </CardContent>
          </Card>
        </div>

        <CarManager onCarsChange={(newCars) => setCars(newCars)} />

        {/* Create Token */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full">
              <Plus className="h-5 w-5 mr-2" />
              Create New Token
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
              <DialogDescription>Set limits and generate a shareable token for the guest.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label>Guest Name *</Label>
                <Input placeholder="Enter guest name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Guest Phone (Optional)</Label>
                <Input placeholder="+91 9876543210" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
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
              </div>

              <SliderWithInput label="Token Validity" icon={<Clock className="h-4 w-4 text-primary" />} value={validityHours} onChange={setValidityHours} min={1} max={72} step={1} unit="hrs" />
              <SliderWithInput label="Speed Limit" icon={<Gauge className="h-4 w-4 text-primary" />} value={speedLimit} onChange={setSpeedLimit} min={0} max={120} step={5} unit="km/h" />
              <SliderWithInput label="Time Limit" icon={<Clock className="h-4 w-4 text-primary" />} value={timeLimit} onChange={setTimeLimit} min={0} max={180} step={5} unit="mins" />
              <SliderWithInput label="Distance Limit" icon={<MapPin className="h-4 w-4 text-primary" />} value={distanceLimit} onChange={setDistanceLimit} min={0} max={50} step={1} unit="km" />
              <SliderWithInput label="Fuel Limit" icon={<Fuel className="h-4 w-4 text-primary" />} value={fuelLimit} onChange={setFuelLimit} min={0} max={100} step={5} unit="%" />
              <SliderWithInput label="Geofence Radius" icon={<MapPin className="h-4 w-4 text-primary" />} value={geofenceRadius} onChange={setGeofenceRadius} min={0} max={20} step={0.5} unit="km" />

              <Button onClick={handleCreateToken} className="w-full" size="lg">Generate Token</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Tokens List */}
        <Tabs value={tokenTab} onValueChange={setTokenTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active ({activeTokens.length})</TabsTrigger>
            <TabsTrigger value="archived"><Archive className="h-4 w-4 mr-1" /> Archived ({archivedTokens.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="space-y-3 mt-4">
            {activeTokens.length === 0 ? (
              <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">No active tokens</CardContent></Card>
            ) : (
              activeTokens.map(token => (
                <TokenCard key={token.id} token={token} sessions={sessions} cars={cars} getTokenStatus={getTokenStatus} getCarName={getCarName} onExpire={handleExpireToken} tokens={tokens} />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="archived" className="space-y-3 mt-4">
            {archivedTokens.length === 0 ? (
              <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">No archived tokens</CardContent></Card>
            ) : (
              archivedTokens.map(token => (
                <TokenCard key={token.id} token={token} sessions={sessions} cars={cars} getTokenStatus={getTokenStatus} getCarName={getCarName} onExpire={handleExpireToken} tokens={tokens} isArchived />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Token Card Component
function TokenCard({ token, sessions, cars, getTokenStatus, getCarName, onExpire, tokens, isArchived }: any) {
  const status = getTokenStatus(token);
  const session = sessions.find((s: any) => s.token_id === token.id);
  const carName = getCarName(token.car_id);

  return (
    <Card className={`transition-all animate-in ${status === 'active' ? 'card-glow border-primary/50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-semibold text-lg">{token.guest_name}</span>
              {carName && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${carName === '(Deleted Vehicle)' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                  <Car className="h-3 w-3" /> {carName}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                status === 'active' ? 'bg-success/20 text-success' :
                status === 'pending' ? 'bg-warning/20 text-warning' :
                status === 'returned' ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {status === 'active' && <Activity className="h-3 w-3 inline mr-1" />}
                {status === 'returned' && <Undo2 className="h-3 w-3 inline mr-1" />}
                {status === 'used' && <CheckCircle className="h-3 w-3 inline mr-1" />}
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <code className="bg-card border px-3 py-1.5 rounded-lg font-mono text-sm sm:text-lg tracking-widest">
                {token.token_code}
              </code>
              {!isArchived && (
                <>
                  <TokenShareMenu tokenCode={token.token_code} childName={token.guest_name} />
                  <MessageCenter tokenId={token.id} guestName={token.guest_name} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Expire Token?</AlertDialogTitle>
                        <AlertDialogDescription>This will immediately invalidate the token. The guest won't be able to use it anymore.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onExpire(token.id)} className="bg-destructive">Expire Token</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Gauge className="h-3 w-3 sm:h-4 sm:w-4" /> {token.speed_limit}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3 sm:h-4 sm:w-4" /> {token.time_limit_minutes}m</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3 sm:h-4 sm:w-4" /> {Number(token.distance_limit_km)}km</span>
              <span className="flex items-center gap-1"><Fuel className="h-3 w-3 sm:h-4 sm:w-4" /> {token.fuel_limit_percent}%</span>
            </div>

            {session && (
              <div className="mt-3 p-3 bg-secondary/50 rounded-lg">
                <div className="grid grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <p className="text-muted-foreground">Speed</p>
                    <p className={`font-semibold ${session.current_speed > token.speed_limit ? 'text-destructive' : ''}`}>{session.current_speed}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Distance</p>
                    <p className="font-semibold">{Number(session.current_distance_km).toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fuel</p>
                    <p className={`font-semibold ${session.current_fuel_percent < 20 ? 'text-warning' : ''}`}>{session.current_fuel_percent}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Violations</p>
                    <p className={`font-semibold ${session.total_violations > 0 ? 'text-destructive' : 'text-success'}`}>{session.total_violations}</p>
                  </div>
                </div>
                {session.status !== 'active' && <SessionSummary session={session} token={token} />}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}