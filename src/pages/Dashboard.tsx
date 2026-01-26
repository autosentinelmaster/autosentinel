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
import { Badge } from '@/components/ui/badge';
import { 
  Shield, Plus, Car, Activity, AlertTriangle, 
  Clock, Gauge, MapPin, CheckCircle, Fuel, Undo2, Archive, XCircle, Copy,
  User, PauseCircle, Menu, Key
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
import { FullScreenSOS } from '@/components/FullScreenSOS';
import { HowItWorksGuide } from '@/components/HowItWorksGuide';
import { SliderWithInput } from '@/components/SliderWithInput';
import logoIcon from '@/assets/logo-icon.png';

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
  const [sosAlert, setSosAlert] = useState<{ open: boolean; guestName: string; message: string; vehicleName?: string }>({
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
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
  }, [user, authLoading, navigate]);

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
              vehicleName: getCarName(token.car_id) || undefined
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
      toast.error('Failed to create token 😕');
    } else {
      toast.success('Token created! 🎉 Share it with your guest');
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
      toast.success('Token expired successfully! 👍');
      fetchData();
    }
  };

  const handleWithholdToken = async (tokenId: string, currentlyActive: boolean) => {
    const { error } = await supabase
      .from('driving_tokens')
      .update({ is_active: !currentlyActive })
      .eq('id', tokenId);

    if (error) {
      toast.error('Failed to update token');
    } else {
      toast.success(currentlyActive ? 'Token withheld! Guest access is paused ⏸️' : 'Token resumed! Guest can continue 🚗');
      fetchData();
    }
  };

  const resetForm = () => {
    setGuestName('');
    setGuestPhone('');
    setSelectedCarId(cars.length > 0 ? cars[0].id : '');
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
    return car ? car.name : '(Deleted Vehicle)';
  };

  const activeTokens = tokens.filter(t => ['pending', 'active'].includes(getTokenStatus(t)));
  const archivedTokens = tokens.filter(t => ['expired', 'used', 'returned'].includes(getTokenStatus(t)));
  
  // Fixed: Only count sessions that are actually active
  const activeSessionsCount = sessions.filter(s => s.status === 'active').length;
  const totalViolations = sessions.reduce((sum, s) => sum + s.total_violations, 0);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <span className="text-muted-foreground">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <FullScreenSOS 
        open={sosAlert.open}
        onClose={() => setSosAlert(prev => ({ ...prev, open: false }))}
        guestName={sosAlert.guestName}
        message={sosAlert.message}
        vehicleName={sosAlert.vehicleName}
      />

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoIcon} alt="AutoSentinel" className="h-9 w-9 rounded-lg object-cover" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-display font-bold">AutoSentinel</h1>
              <p className="text-xs text-muted-foreground">Owner Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HowItWorksGuide />
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={handleLogout}>
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        {/* Welcome Message */}
        <div className="animate-in">
          <h2 className="text-2xl font-display font-bold">
            Welcome back! 👋
          </h2>
          <p className="text-muted-foreground">
            Here's what's happening with your vehicles today
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="stats-card animate-in">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Active Tokens</p>
                  <p className="text-3xl font-display font-bold">{activeTokens.length}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Car className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

        <Card className="stats-card animate-in stagger-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Created Tokens</p>
                  <p className="text-3xl font-display font-bold">{tokens.length}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center">
                  <Key className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card animate-in stagger-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Vehicles</p>
                  <p className="text-3xl font-display font-bold">{cars.length}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Car className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`stats-card animate-in stagger-3 ${totalViolations > 0 ? 'border-destructive/30' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Violations</p>
                  <p className="text-3xl font-display font-bold">{totalViolations}</p>
                </div>
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${totalViolations > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                  <AlertTriangle className={`h-6 w-6 ${totalViolations > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vehicle Manager */}
        <CarManager onCarsChange={(newCars) => setCars(newCars)} />

        {/* Create Token Button */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full gap-2 text-base py-6 rounded-2xl">
              <Plus className="h-5 w-5" />
              Create New Token
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto"  style={{ maxHeight: '85vh' }}>
            <DialogHeader>
              <DialogTitle className="font-display flex items-center justify-between">
                Create Permission Token 🔑
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
              <DialogDescription>Set limits and share with your guest</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label>Guest Name *</Label>
                <Input placeholder="Who's driving?" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone (Optional)</Label>
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
                {cars.length === 0 && (
                  <p className="text-xs text-muted-foreground">Add a vehicle first to assign it</p>
                )}
              </div>

              <SliderWithInput label="Token Valid For" icon={<Clock className="h-4 w-4 text-primary" />} value={validityHours} onChange={setValidityHours} min={1} max={72} step={1} unit="hours" />
              <SliderWithInput label="Speed Limit" icon={<Gauge className="h-4 w-4 text-primary" />} value={speedLimit} onChange={setSpeedLimit} min={0} max={120} step={5} unit="km/h" />
              <SliderWithInput label="Driving Time" icon={<Clock className="h-4 w-4 text-primary" />} value={timeLimit} onChange={setTimeLimit} min={0} max={180} step={5} unit="mins" />
              <SliderWithInput label="Distance" icon={<MapPin className="h-4 w-4 text-primary" />} value={distanceLimit} onChange={setDistanceLimit} min={0} max={50} step={1} unit="km" />
              <SliderWithInput label="Fuel Limit" icon={<Fuel className="h-4 w-4 text-primary" />} value={fuelLimit} onChange={setFuelLimit} min={0} max={100} step={5} unit="%" />
              <SliderWithInput label="Geofence" icon={<MapPin className="h-4 w-4 text-primary" />} value={geofenceRadius} onChange={setGeofenceRadius} min={0} max={20} step={0.5} unit="km" />

              <Button onClick={handleCreateToken} className="w-full py-6 text-base rounded-xl" size="lg">
                Generate Token 🚀
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Tokens List */}
        <Tabs value={tokenTab} onValueChange={setTokenTab}>
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="active" className="rounded-lg gap-2">
              <Car className="h-4 w-4" /> Active ({activeTokens.length})
            </TabsTrigger>
            <TabsTrigger value="archived" className="rounded-lg gap-2">
              <Archive className="h-4 w-4" /> History ({archivedTokens.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="space-y-3 mt-4">
            {activeTokens.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-2">No active tokens yet</p>
                  <p className="text-sm text-muted-foreground">Create a token to share vehicle access 🚗</p>
                </CardContent>
              </Card>
            ) : (
              activeTokens.map(token => (
                <TokenCard 
                  key={token.id} 
                  token={token} 
                  sessions={sessions} 
                  cars={cars} 
                  getTokenStatus={getTokenStatus} 
                  getCarName={getCarName} 
                  onExpire={handleExpireToken} 
                  onWithhold={handleWithholdToken}
                  tokens={tokens} 
                />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="archived" className="space-y-3 mt-4">
            {archivedTokens.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No archived tokens yet
                </CardContent>
              </Card>
            ) : (
              archivedTokens.map(token => (
                <TokenCard 
                  key={token.id} 
                  token={token} 
                  sessions={sessions} 
                  cars={cars} 
                  getTokenStatus={getTokenStatus} 
                  getCarName={getCarName} 
                  onExpire={handleExpireToken}
                  onWithhold={handleWithholdToken}
                  tokens={tokens} 
                  isArchived 
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Token Card Component
function TokenCard({ token, sessions, cars, getTokenStatus, getCarName, onExpire, onWithhold, tokens, isArchived }: any) {
  const status = getTokenStatus(token);
  const session = sessions.find((s: any) => s.token_id === token.id && s.status === 'active');
  const lastSession = sessions.find((s: any) => s.token_id === token.id);
  const carName = getCarName(token.car_id);

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: 'bg-success/10', text: 'text-success', label: '🟢 Active' },
    pending: { bg: 'bg-warning/10', text: 'text-warning', label: '🟡 Ready' },
    returned: { bg: 'bg-primary/10', text: 'text-primary', label: '↩️ Returned' },
    expired: { bg: 'bg-muted', text: 'text-muted-foreground', label: '⏰ Expired' },
    used: { bg: 'bg-muted', text: 'text-muted-foreground', label: '✓ Used' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Card className={`overflow-hidden transition-all animate-in ${status === 'active' ? 'card-glow border-primary/30' : ''}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{token.guest_name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {carName && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Car className="h-3 w-3" /> {carName}
                    </Badge>
                  )}
                  <Badge className={`${config.bg} ${config.text} border-0 text-xs`}>
                    {config.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Token Code */}
          <div className="flex items-center gap-2 flex-wrap">
            <code className="bg-secondary px-4 py-2 rounded-xl font-mono text-base tracking-widest flex-grow text-center">
              {token.token_code}
            </code>
            {!isArchived && (
              <div className="flex items-center gap-1">
                <TokenShareMenu tokenCode={token.token_code} childName={token.guest_name} />
                <MessageCenter tokenId={token.id} guestName={token.guest_name} />
                
                {/* Withhold Button */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9"
                  onClick={() => onWithhold(token.id, token.is_active)}
                  title={token.is_active ? 'Withhold token' : 'Resume token'}
                >
                  <PauseCircle className={`h-4 w-4 ${token.is_active ? 'text-warning' : 'text-muted-foreground'}`} />
                </Button>

                {/* Expire Button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Expire this token? 🤔</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently disable the token. {token.guest_name} won't be able to use it anymore.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onExpire(token.id)} className="bg-destructive hover:bg-destructive/90">
                        Yes, Expire It
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          {/* Limits Display */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-lg">
              <Gauge className="h-3.5 w-3.5" /> {token.speed_limit} km/h
            </span>
            <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-lg">
              <Clock className="h-3.5 w-3.5" /> {token.time_limit_minutes} min
            </span>
            <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-lg">
              <MapPin className="h-3.5 w-3.5" /> {Number(token.distance_limit_km)} km
            </span>
            <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-lg">
              <Fuel className="h-3.5 w-3.5" /> {token.fuel_limit_percent}%
            </span>
          </div>

          {/* Live Session Data */}
          {session && (
            <div className="mt-3 p-3 bg-success/5 border border-success/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-success animate-pulse" />
                <span className="text-sm font-medium text-success">Live Session</span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Speed</p>
                  <p className={`font-semibold ${session.current_speed > token.speed_limit ? 'text-destructive' : ''}`}>
                    {session.current_speed} <span className="text-xs text-muted-foreground">km/h</span>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Distance</p>
                  <p className="font-semibold">{Number(session.current_distance_km).toFixed(1)} <span className="text-xs text-muted-foreground">km</span></p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fuel</p>
                  <p className={`font-semibold ${session.current_fuel_percent < 20 ? 'text-warning' : ''}`}>
                    {session.current_fuel_percent}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Violations</p>
                  <p className={`font-semibold ${session.total_violations > 0 ? 'text-destructive' : 'text-success'}`}>
                    {session.total_violations}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Completed Session Summary */}
          {lastSession && lastSession.status !== 'active' && (
            <SessionSummary session={lastSession} token={token} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
