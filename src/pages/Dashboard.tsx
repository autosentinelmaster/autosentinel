import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, Plus, Car, Activity, AlertTriangle, 
  Clock, Gauge, MapPin, Fuel, Archive, XCircle,
   User, PauseCircle, Key, BarChart3, Users, LogOut, PlayCircle
} from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { SessionSummary } from '@/components/SessionSummary';
import { TokenShareMenu } from '@/components/TokenShareMenu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CarManager } from '@/components/CarManager';
import { MessageButton } from '@/components/MessageButton';
import { FullScreenSOS } from '@/components/FullScreenSOS';
import { HowItWorksButton } from '@/components/HowItWorksButton';
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
  const [tokenTab, setTokenTab] = useState('active');
  
  // SOS Alert state
  const [sosAlert, setSosAlert] = useState<{ open: boolean; guestName: string; message: string; vehicleName?: string }>({
    open: false, guestName: '', message: ''
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, authLoading, navigate]);

  // Set up realtime subscriptions only after tokens are loaded
  useEffect(() => {
    if (!user || tokens.length === 0) return;
    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tokens.map(t => t.id).join(',')]);


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
    const tokenIds = tokens.map(t => t.id);
    const filterExpr = `token_id=in.(${tokenIds.join(',')})`;

    const sessionsChannel = supabase
      .channel('sessions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driving_sessions', filter: filterExpr }, () => {
        fetchData();
      })
      .subscribe();

    const alertsChannel = supabase
      .channel('alerts-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts', filter: filterExpr }, (payload) => {
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
        table: 'messages',
        filter: filterExpr
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
      toast.success(currentlyActive ? 'Token withheld! Guest access is paused.' : 'Token resumed! Guest can continue.');
      fetchData();
    }
  };

   const getTokenStatus = (token: DrivingToken): string => {
    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    if (token.is_returned) return 'returned';
    if (expiresAt < now) return 'expired';
     // Withheld = used but not active (owner paused it)
     if (token.is_used && !token.is_active) return 'withheld';
    if (token.is_active) return 'active';
    if (token.is_used) return 'used';
    return 'pending';
  };

  const getCarName = (carId: string | null) => {
    if (!carId) return null;
    const car = cars.find(c => c.id === carId);
    return car ? car.name : '(Deleted Vehicle)';
  };

   const activeTokens = tokens.filter(t => ['pending', 'active', 'withheld'].includes(getTokenStatus(t)));
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
            <Link to="/ai-summaries">
              <Button variant="ghost" size="icon" className="h-9 w-9" title="AI Summaries">
                <BarChart3 className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/past-users">
              <Button variant="ghost" size="icon" className="h-9 w-9" title="Past Users">
                <Users className="h-5 w-5" />
              </Button>
            </Link>
            <HowItWorksButton />
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 text-destructive hover:text-destructive"
              onClick={() => signOut()}
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
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
        <Link to="/create-token">
          <Button size="lg" className="w-full gap-2 text-base py-6 rounded-2xl">
            <Plus className="h-5 w-5" />
            Create New Token
          </Button>
        </Link>

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
                  <p className="text-sm text-muted-foreground">Create a token to share vehicle access</p>
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
    active: { bg: 'bg-success/10', text: 'text-success', label: 'Active' },
    pending: { bg: 'bg-warning/10', text: 'text-warning', label: 'Ready' },
    returned: { bg: 'bg-primary/10', text: 'text-primary', label: 'Returned' },
    expired: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Expired' },
    used: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Used' },
     withheld: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Withheld' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
     <Card className={`overflow-hidden transition-all animate-in ${status === 'active' ? 'card-glow border-primary/30' : ''} ${status === 'withheld' ? 'border-destructive/30' : ''}`}>
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
                <MessageButton tokenId={token.id} guestName={token.guest_name} />
                
                {/* Withhold Button */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                   className={`h-9 w-9 ${status === 'withheld' ? 'bg-success/10 hover:bg-success/20' : ''}`}
                   onClick={() => onWithhold(token.id, status !== 'withheld')}
                   title={status === 'withheld' ? 'Resume token (un-withhold)' : 'Withhold token'}
                >
                   {status === 'withheld' ? (
                     <PlayCircle className="h-4 w-4 text-success" />
                   ) : (
                     <PauseCircle className={`h-4 w-4 ${status === 'active' ? 'text-warning' : 'text-muted-foreground'}`} />
                   )}
                </Button>

                {/* Expire Button - simple click with toast confirmation */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-destructive hover:text-destructive"
                  onClick={() => {
                    toast(`Expire token for ${token.guest_name}?`, {
                      action: {
                        label: 'Yes, Expire',
                        onClick: () => onExpire(token.id)
                      },
                      cancel: {
                        label: 'Cancel',
                        onClick: () => {}
                      }
                    });
                  }}
                  title="Expire token"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
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
