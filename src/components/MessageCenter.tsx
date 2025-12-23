import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageCircle, Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  token_id: string;
  sender_type: string;
  message: string;
  is_sos: boolean;
  is_read: boolean;
  created_at: string;
}

interface MessageCenterProps {
  tokenId: string;
  guestName: string;
  onSOSReceived?: (message: Message) => void;
}

export function MessageCenter({ tokenId, guestName, onSOSReceived }: MessageCenterProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const unreadCount = messages.filter(m => !m.is_read && m.sender_type === 'guest').length;

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${tokenId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `token_id=eq.${tokenId}`
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        
        if (newMsg.is_sos && newMsg.sender_type === 'guest') {
          onSOSReceived?.(newMsg);
        } else if (newMsg.sender_type === 'guest') {
          toast.info(`Message from ${guestName}: ${newMsg.message.slice(0, 50)}...`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tokenId, guestName, onSOSReceived]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('token_id', tokenId)
      .order('created_at', { ascending: true });

    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setSending(true);
    const { error } = await supabase
      .from('messages')
      .insert({
        token_id: tokenId,
        sender_type: 'owner',
        message: newMessage.trim(),
        is_sos: false
      });

    if (error) {
      toast.error('Failed to send message');
    } else {
      setNewMessage('');
      fetchMessages();
    }
    setSending(false);
  };

  const markAsRead = async () => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('token_id', tokenId)
      .eq('sender_type', 'guest')
      .eq('is_read', false);
    
    fetchMessages();
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      setDialogOpen(open);
      if (open) markAsRead();
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <MessageCircle className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Messages with {guestName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col h-80">
          <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-secondary/30 rounded-lg">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No messages yet</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2 rounded-lg max-w-[80%] ${
                    msg.sender_type === 'owner' 
                      ? 'ml-auto bg-primary text-primary-foreground' 
                      : msg.is_sos 
                        ? 'bg-destructive text-destructive-foreground'
                        : 'bg-card'
                  }`}
                >
                  {msg.is_sos && (
                    <div className="flex items-center gap-1 text-xs font-bold mb-1">
                      <AlertTriangle className="h-3 w-3" /> SOS
                    </div>
                  )}
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
