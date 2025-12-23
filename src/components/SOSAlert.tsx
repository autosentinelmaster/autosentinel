import { useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, X } from 'lucide-react';

interface SOSAlertProps {
  open: boolean;
  onClose: () => void;
  guestName: string;
  message: string;
  carName?: string;
}

export function SOSAlert({ open, onClose, guestName, message, carName }: SOSAlertProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (open) {
      // Create and play alert sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Beep pattern
      const beepInterval = setInterval(() => {
        gainNode.gain.value = gainNode.gain.value === 0 ? 0.3 : 0;
      }, 500);

      return () => {
        clearInterval(beepInterval);
        oscillator.stop();
        audioContext.close();
      };
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-lg bg-destructive text-destructive-foreground border-none p-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="p-6 space-y-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
                <AlertTriangle className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-3xl font-display font-bold">EMERGENCY SOS</h2>
                <p className="text-destructive-foreground/80">From: {guestName}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-destructive-foreground hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {carName && (
            <div className="p-3 bg-white/10 rounded-lg">
              <span className="font-semibold">Vehicle: {carName}</span>
            </div>
          )}

          <div className="p-4 bg-white/10 rounded-lg">
            <p className="text-lg">{message}</p>
          </div>

          <div className="text-center text-sm text-destructive-foreground/70">
            <p>The guest has triggered an emergency alert.</p>
            <p>Please check on them immediately!</p>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              className="flex-1 bg-white text-destructive hover:bg-white/90"
              onClick={onClose}
            >
              <Phone className="h-4 w-4 mr-2" />
              Call Guest
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 border-white/50 hover:bg-white/10"
              onClick={onClose}
            >
              Acknowledge
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
