import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Sparkles, Loader2, BarChart3, User, Calendar, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoIcon from '@/assets/logo-icon.png';
import type { Database } from '@/integrations/supabase/types';

type DrivingToken = Database['public']['Tables']['driving_tokens']['Row'];
type DrivingSession = Database['public']['Tables']['driving_sessions']['Row'];
type Violation = Database['public']['Tables']['violations']['Row'];

export default function AISummaries() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  
  const [tokens, setTokens] = useState<DrivingToken[]>([]);
  const [sessions, setSessions] = useState<DrivingSession[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  
  // Filters
  const [filterType, setFilterType] = useState<string>('last-5');
  const [selectedUser, setSelectedUser] = useState<string>('all');

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
          .neq('status', 'pending')
          .order('created_at', { ascending: false });

        setSessions(sessionsData || []);

        if (sessionsData && sessionsData.length > 0) {
          const sessionIds = sessionsData.map(s => s.id);
          const { data: violationsData } = await supabase
            .from('violations')
            .select('*')
            .in('session_id', sessionIds);
          setViolations(violationsData || []);
        }
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Get unique guest names for user filter
  const uniqueGuests = Array.from(new Set(tokens.map(t => t.guest_name)));

  // Filter sessions based on selected criteria
  const getFilteredSessions = () => {
    let filtered = [...sessions];

    // Filter by user if selected
    if (selectedUser !== 'all') {
      const userTokenIds = tokens.filter(t => t.guest_name === selectedUser).map(t => t.id);
      filtered = filtered.filter(s => userTokenIds.includes(s.token_id));
    }

    // Filter by count
    switch (filterType) {
      case 'last-1':
        return filtered.slice(0, 1);
      case 'last-5':
        return filtered.slice(0, 5);
      case 'last-10':
        return filtered.slice(0, 10);
      case 'all':
        return filtered;
      default:
        return filtered.slice(0, 5);
    }
  };

  const generateSummary = async () => {
    setGenerating(true);
    setSummary(null);

    try {
      const filteredSessions = getFilteredSessions();
      
      if (filteredSessions.length === 0) {
        toast.error('No sessions found for the selected filters');
        setGenerating(false);
        return;
      }

      // Prepare session data for AI
      const sessionData = filteredSessions.map(session => {
        const token = tokens.find(t => t.id === session.token_id);
        const sessionViolations = violations.filter(v => v.session_id === session.id);
        
        return {
          guestName: token?.guest_name,
          guestId: `G-${tokens.indexOf(token!).toString().padStart(3, '0')}`,
          status: session.status,
          startTime: session.start_time,
          endTime: session.end_time,
          maxSpeed: session.max_speed_reached,
          speedLimit: token?.speed_limit,
          distance: session.current_distance_km,
          distanceLimit: token?.distance_limit_km,
          totalViolations: session.total_violations,
          suddenStops: session.sudden_stops_count,
          violations: sessionViolations.map(v => ({
            type: v.violation_type,
            description: v.description,
            speed: v.speed_at_violation
          }))
        };
      });

      const { data, error } = await supabase.functions.invoke('generate-bulk-summary', {
        body: { 
          sessions: sessionData,
          filterType,
          selectedUser: selectedUser === 'all' ? null : selectedUser,
          totalSessions: filteredSessions.length
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
      } else {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary');
    } finally {
      setGenerating(false);
    }
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
              <h1 className="text-lg font-display font-bold">AI Summaries</h1>
              <p className="text-xs text-muted-foreground">Intelligent driving reports</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="space-y-6 animate-in">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              AI Summaries & Ratings
            </h1>
            <p className="text-muted-foreground">Generate intelligent reports based on driving history</p>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filter Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Session Range
                  </Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last-1">Last 1 Drive</SelectItem>
                      <SelectItem value="last-5">Last 5 Drives</SelectItem>
                      <SelectItem value="last-10">Last 10 Drives</SelectItem>
                      <SelectItem value="all">All Drives</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Guest
                  </Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Guests</SelectItem>
                      {uniqueGuests.map((name, index) => (
                        <SelectItem key={name} value={name}>
                          G-{index.toString().padStart(3, '0')}: {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">
                  {getFilteredSessions().length} session(s) selected
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button 
            size="lg" 
            className="w-full gap-2" 
            onClick={generateSummary}
            disabled={generating || sessions.length === 0}
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating Summary...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generate AI Summary & Ratings
              </>
            )}
          </Button>

          {sessions.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No completed sessions yet</p>
                <p className="text-sm text-muted-foreground">Data will appear once guests complete their drives</p>
              </CardContent>
            </Card>
          )}

          {/* Generated Summary */}
          {summary && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI-Generated Report
                </CardTitle>
                <CardDescription>
                  {filterType === 'all' ? 'All' : filterType.replace('-', ' ').replace('last', 'Last')} drives
                  {selectedUser !== 'all' ? ` for ${selectedUser}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {summary}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
