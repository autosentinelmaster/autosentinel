import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface MessageButtonProps {
  tokenId: string;
  guestName: string;
}

export function MessageButton({ tokenId, guestName }: MessageButtonProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnread();

    const channel = supabase
      .channel(`unread-${tokenId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `token_id=eq.${tokenId}`
      }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tokenId]);

  const fetchUnread = async () => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('token_id', tokenId)
      .eq('sender_type', 'guest')
      .eq('is_read', false);
    
    setUnreadCount(count || 0);
  };

  return (
    <Link to={`/messages?token=${tokenId}&guest=${encodeURIComponent(guestName)}`}>
      <Button variant="ghost" size="sm" className="relative">
        <MessageCircle className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>
    </Link>
  );
}
