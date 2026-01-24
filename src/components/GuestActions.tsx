import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AlertTriangle, MessageCircle, Send, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { GuestChatDialog } from './GuestChatDialog';

interface GuestActionsProps {
  tokenCode: string;
  sessionSecret: string;
  guestName: string;
  tokenId: string;
  onTokenReturned?: () => void;
}

export function GuestActions({ tokenCode, sessionSecret, guestName, tokenId, onTokenReturned }: GuestActionsProps) {
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
            <span className="hidden sm:inline">SOS</span>
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

      {/* Chat with Owner */}
      <GuestChatDialog 
        tokenCode={tokenCode}
        sessionSecret={sessionSecret}
        tokenId={tokenId}
        guestName={guestName}
      />

      {/* Return Token */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="secondary" size="sm">
            <Undo2 className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Return</span>
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