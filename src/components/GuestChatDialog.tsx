import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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

interface GuestChatDialogProps {
  tokenCode: string;
  sessionSecret: string;
  tokenId: string;
  guestName: string;
}

export function GuestChatDialog({ tokenCode, sessionSecret, tokenId, guestName }: GuestChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unreadCount = messages.filter(m => !m.is_read && m.sender_type === 'owner').length;

  useEffect(() => {
    if (dialogOpen && tokenId) {
      fetchMessages();

      // Subscribe to new messages
      const channel = supabase
        .channel(`guest-messages-${tokenId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `token_id=eq.${tokenId}`
        }, (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [dialogOpen, tokenId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    // Guest can't directly query - messages are fetched through RPC if needed
    // For now, messages sync via realtime
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setSending(true);
    const { data, error } = await supabase.rpc('send_guest_message', {
      p_token_code: tokenCode,
      p_session_secret: sessionSecret,
      p_message: newMessage.trim()
    });

    if (data) {
      setNewMessage('');
      // Message will appear via realtime subscription
    } else {
      toast.error('Failed to send message');
    }
    setSending(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <MessageCircle className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Chat</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center animate-bounce-gentle">
              {unreadCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chat with Owner</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col h-80">
          <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-secondary/30 rounded-lg">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Send a message to the owner</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2 rounded-lg max-w-[80%] animate-scale-in ${
                    msg.sender_type === 'guest' 
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
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              maxLength={500}
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