import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MessageCircle, Send, AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoIcon from '@/assets/logo-icon.png';

interface Message {
  id: string;
  token_id: string;
  sender_type: string;
  message: string;
  is_sos: boolean;
  is_read: boolean;
  created_at: string;
}

export default function Messages() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenId = searchParams.get('token');
  const guestName = searchParams.get('guest') || 'Guest';
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!tokenId) {
      navigate('/dashboard');
      return;
    }
    
    fetchMessages();
    markAsRead();

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
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, authLoading, navigate, tokenId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    if (!tokenId) return;
    
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('token_id', tokenId)
      .order('created_at', { ascending: true });

    setMessages(data || []);
    setLoading(false);
  };

  const markAsRead = async () => {
    if (!tokenId) return;
    
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('token_id', tokenId)
      .eq('sender_type', 'guest')
      .eq('is_read', false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !tokenId) return;
    
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
    }
    setSending(false);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <span className="text-muted-foreground">Loading messages...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logoIcon} alt="AutoSentinel" className="h-9 w-9 rounded-lg object-cover" />
            <div>
              <h1 className="text-lg font-display font-bold">Messages</h1>
              <p className="text-xs text-muted-foreground">Chat with {guestName}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 container mx-auto px-4 py-4 max-w-2xl flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardContent className="flex-1 flex flex-col p-4">
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                  <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
                  <p className="font-medium">No messages yet</p>
                  <p className="text-sm">Start the conversation with {guestName}</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl max-w-[80%] ${
                      msg.sender_type === 'owner' 
                        ? 'ml-auto bg-primary text-primary-foreground' 
                        : msg.is_sos 
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-secondary'
                    }`}
                  >
                    {msg.is_sos && (
                      <div className="flex items-center gap-1 text-xs font-bold mb-1">
                        <AlertTriangle className="h-3 w-3" /> SOS ALERT
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
            
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
