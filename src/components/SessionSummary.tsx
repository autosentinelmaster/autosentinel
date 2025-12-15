import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type DrivingToken = Database['public']['Tables']['driving_tokens']['Row'];
type DrivingSession = Database['public']['Tables']['driving_sessions']['Row'];

interface SessionSummaryProps {
  session: DrivingSession;
  token: DrivingToken;
}

export function SessionSummary({ session, token }: SessionSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      // Fetch violations for this session
      const { data: violations } = await supabase
        .from('violations')
        .select('*')
        .eq('session_id', session.id);

      const { data, error } = await supabase.functions.invoke('generate-session-summary', {
        body: { session, token, violations: violations || [] }
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
      setLoading(false);
    }
  };

  if (session.status === 'pending') {
    return null;
  }

  return (
    <div className="mt-2">
      {summary ? (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={generateSummary}
          disabled={loading}
          className="text-xs h-7"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3 mr-1" />
          )}
          AI Summary
        </Button>
      )}
    </div>
  );
}
