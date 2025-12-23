import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AlertTriangle, MessageCircle, Send, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

interface GuestActionsProps {
  tokenCode: string;
  sessionSecret: string;
  guestName: string;
  onTokenReturned?: () => void;
}

export function GuestActions({ tokenCode, sessionSecret, guestName, onTokenReturned }: GuestActionsProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  const sendSOS = async () => {
    const { data, error } = await supabase.rpc('send_sos', {
      p_token_code: tokenCode,
      p_session_secret: sessionSecret,
      p_message: 'EMERGENCY! I need help immediately!'
    });

    if (data) {
      toast.success('SOS sent to owner!');
    } else {
      toast.error('Failed to send SOS');
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    
    setSending(true);
    const { data, error } = await supabase.rpc('send_guest_message', {
      p_token_code: tokenCode,
      p_session_secret: sessionSecret,
      p_message: message.trim()
    });

    if (data) {
      toast.success('Message sent to owner');
      setMessage('');
      setMessageDialogOpen(false);
    } else {
      toast.error('Failed to send message');
    }
    setSending(false);
  };

  const returnToken = async () => {
    const { data, error } = await supabase.rpc('return_token', {
      p_token_code: tokenCode,
      p_session_secret: sessionSecret
    });

    if (data) {
      toast.success('Token returned to owner. Drive session ended.');
      onTokenReturned?.();
    } else {
      toast.error('Failed to return token');
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* SOS Button */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" className="animate-pulse">
            <AlertTriangle className="h-4 w-4 mr-1" />
            SOS
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Send Emergency SOS?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately alert the owner with a loud notification. 
              Only use this in case of a real emergency.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={sendSOS} className="bg-destructive hover:bg-destructive/90">
              Send SOS Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Message Owner */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <MessageCircle className="h-4 w-4 mr-1" />
            Message Owner
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message to Owner</DialogTitle>
            <DialogDescription>
              Let the owner know if you have any issues or updates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{message.length}/500 characters</p>
            <Button onClick={sendMessage} disabled={sending || !message.trim()} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Return Token */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="secondary" size="sm">
            <Undo2 className="h-4 w-4 mr-1" />
            Return Token
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return Token Early?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end your driving session and return the token to the owner. 
              You won't be able to drive with this token again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Driving</AlertDialogCancel>
            <AlertDialogAction onClick={returnToken}>
              Return Token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
