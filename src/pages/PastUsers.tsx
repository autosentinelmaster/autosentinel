import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Star, Phone, AlertTriangle, Gauge, MapPin, Clock, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import logoIcon from '@/assets/logo-icon.png';
import type { Database } from '@/integrations/supabase/types';

type DrivingToken = Database['public']['Tables']['driving_tokens']['Row'];
type DrivingSession = Database['public']['Tables']['driving_sessions']['Row'];
type Car = Database['public']['Tables']['cars']['Row'];

interface UserStats {
  guestName: string;
  guestId: string;
  phone: string | null;
  totalSessions: number;
  completedSessions: number;
  violatedSessions: number;
  totalViolations: number;
  averageSpeed: number;
  maxSpeedEver: number;
  totalDistance: number;
  totalDuration: number;
  suddenStops: number;
  vehiclesUsed: string[];
  rating: number;
  ratingJustification: string;
  lastActiveAt: string | null;
}

function calculateRating(stats: Omit<UserStats, 'rating' | 'ratingJustification'>): { rating: number; justification: string } {
  let score = 5.0;
  let reasons: string[] = [];

  // Deduct for violations (major factor)
  const violationRate = stats.totalViolations / Math.max(stats.completedSessions, 1);
  if (violationRate > 2) {
    score -= 2.0;
    reasons.push('frequent violations');
  } else if (violationRate > 1) {
    score -= 1.5;
    reasons.push('multiple violations per session');
  } else if (violationRate > 0.5) {
    score -= 0.8;
    reasons.push('some violations');
  } else if (stats.totalViolations > 0) {
    score -= 0.3;
    reasons.push('minor violations');
  }

  // Deduct for violated sessions ratio
  const violatedRatio = stats.violatedSessions / Math.max(stats.completedSessions, 1);
  if (violatedRatio > 0.5) {
    score -= 1.0;
    reasons.push('high violation rate');
  } else if (violatedRatio > 0.2) {
    score -= 0.5;
  }

  // Deduct for sudden stops
  const stopRate = stats.suddenStops / Math.max(stats.completedSessions, 1);
  if (stopRate > 2) {
    score -= 0.8;
    reasons.push('many sudden stops');
  } else if (stopRate > 1) {
    score -= 0.4;
  }

  // Bonus for clean record
  if (stats.totalViolations === 0 && stats.completedSessions >= 3) {
    score = Math.min(5, score + 0.5);
    reasons = ['perfect driving record'];
  }

  // Ensure within bounds
  score = Math.max(1, Math.min(5, score));

  const justification = reasons.length > 0 
    ? reasons.slice(0, 2).join(', ')
    : stats.completedSessions === 0 ? 'No completed drives yet' : 'Good driving behavior';

  return { rating: Math.round(score * 10) / 10, justification };
}

export default function PastUsers() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    if (!user) return;
    try {
      // Fetch all data
      const [{ data: tokensData }, { data: sessionsData }, { data: carsData }] = await Promise.all([
        supabase.from('driving_tokens').select('*').eq('master_user_id', user.id),
        supabase.from('driving_sessions').select('*'),
        supabase.from('cars').select('*').eq('owner_id', user.id)
      ]);

      if (!tokensData) return;

      const tokenIds = tokensData.map(t => t.id);
      const relevantSessions = (sessionsData || []).filter(s => tokenIds.includes(s.token_id));
      const cars = carsData || [];

      // Group by guest name
      const guestMap = new Map<string, { tokens: DrivingToken[]; sessions: DrivingSession[] }>();
      
      tokensData.forEach(token => {
        const existing = guestMap.get(token.guest_name) || { tokens: [], sessions: [] };
        existing.tokens.push(token);
        guestMap.set(token.guest_name, existing);
      });

      relevantSessions.forEach(session => {
        const token = tokensData.find(t => t.id === session.token_id);
        if (token) {
          const existing = guestMap.get(token.guest_name);
          if (existing) {
            existing.sessions.push(session);
          }
        }
      });

      // Calculate stats for each guest
      const stats: UserStats[] = [];
      let guestIndex = 0;

      guestMap.forEach((data, guestName) => {
        const completedSessions = data.sessions.filter(s => s.status === 'completed' || s.status === 'violated');
        const violatedSessions = data.sessions.filter(s => s.status === 'violated');
        const totalViolations = data.sessions.reduce((sum, s) => sum + s.total_violations, 0);
        const suddenStops = data.sessions.reduce((sum, s) => sum + s.sudden_stops_count, 0);
        const maxSpeedEver = Math.max(...data.sessions.map(s => s.max_speed_reached), 0);
        const totalDistance = data.sessions.reduce((sum, s) => sum + Number(s.current_distance_km), 0);
        
        // Calculate total duration in minutes
        let totalDuration = 0;
        completedSessions.forEach(s => {
          if (s.start_time && s.end_time) {
            totalDuration += (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000;
          }
        });

        // Get unique vehicles used
        const vehicleIds = new Set(data.tokens.filter(t => t.car_id).map(t => t.car_id));
        const vehiclesUsed = Array.from(vehicleIds)
          .map(id => cars.find(c => c.id === id)?.name || 'Unknown')
          .filter(Boolean);

        // Get phone (use first available)
        const phone = data.tokens.find(t => t.guest_phone)?.guest_phone || null;

        // Get last active
        const lastSession = data.sessions.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        const baseStats = {
          guestName,
          guestId: `G-${guestIndex.toString().padStart(3, '0')}`,
          phone,
          totalSessions: data.sessions.length,
          completedSessions: completedSessions.length,
          violatedSessions: violatedSessions.length,
          totalViolations,
          averageSpeed: completedSessions.length > 0 
            ? Math.round(data.sessions.reduce((sum, s) => sum + s.max_speed_reached, 0) / data.sessions.length)
            : 0,
          maxSpeedEver,
          totalDistance: Math.round(totalDistance * 10) / 10,
          totalDuration: Math.round(totalDuration),
          suddenStops,
          vehiclesUsed,
          lastActiveAt: lastSession?.updated_at || null
        };

        const { rating, justification } = calculateRating(baseStats);
        
        stats.push({
          ...baseStats,
          rating,
          ratingJustification: justification
        });

        guestIndex++;
      });

      // Sort by last active
      stats.sort((a, b) => {
        if (!a.lastActiveAt) return 1;
        if (!b.lastActiveAt) return -1;
        return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
      });

      setUserStats(stats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-success';
    if (rating >= 3.5) return 'text-primary';
    if (rating >= 2.5) return 'text-warning';
    return 'text-destructive';
  };

  const getRatingBg = (rating: number) => {
    if (rating >= 4.5) return 'bg-success/10';
    if (rating >= 3.5) return 'bg-primary/10';
    if (rating >= 2.5) return 'bg-warning/10';
    return 'bg-destructive/10';
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              <h1 className="text-lg font-display font-bold">Past Users</h1>
              <p className="text-xs text-muted-foreground">Driving history & ratings</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="space-y-6 animate-in">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Past Users
            </h1>
            <p className="text-muted-foreground">View driving history and ratings for all guests</p>
          </div>

          {userStats.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No past users yet</p>
                <p className="text-sm text-muted-foreground">Create tokens to share vehicle access</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {userStats.map((stats) => (
                <Card key={stats.guestId} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-12 w-12 rounded-xl ${getRatingBg(stats.rating)} flex items-center justify-center`}>
                            <Star className={`h-6 w-6 ${getRatingColor(stats.rating)}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">{stats.guestName}</p>
                              <Badge variant="outline" className="text-xs">
                                {stats.guestId}
                              </Badge>
                            </div>
                            {stats.phone && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {stats.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getRatingColor(stats.rating)}`}>
                            {stats.rating.toFixed(1)}
                          </div>
                          <p className="text-xs text-muted-foreground max-w-[120px]">
                            {stats.ratingJustification}
                          </p>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div className="bg-secondary/50 rounded-lg p-2">
                          <p className="text-muted-foreground text-xs mb-1">Sessions</p>
                          <p className="font-semibold">
                            {stats.completedSessions}
                            {stats.violatedSessions > 0 && (
                              <span className="text-destructive text-xs ml-1">
                                ({stats.violatedSessions} violated)
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-2">
                          <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Violations
                          </p>
                          <p className={`font-semibold ${stats.totalViolations > 0 ? 'text-destructive' : 'text-success'}`}>
                            {stats.totalViolations}
                          </p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-2">
                          <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1">
                            <Gauge className="h-3 w-3" /> Max Speed
                          </p>
                          <p className="font-semibold">{stats.maxSpeedEver} km/h</p>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-2">
                          <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Distance
                          </p>
                          <p className="font-semibold">{stats.totalDistance} km</p>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {stats.totalDuration} min total
                        </Badge>
                        {stats.suddenStops > 0 && (
                          <Badge variant="secondary" className="gap-1 text-warning">
                            {stats.suddenStops} sudden stops
                          </Badge>
                        )}
                        {stats.vehiclesUsed.length > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            Vehicles: {stats.vehiclesUsed.slice(0, 2).join(', ')}
                            {stats.vehiclesUsed.length > 2 && ` +${stats.vehiclesUsed.length - 2}`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
