import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, X, Car } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FullScreenSOSProps {
  open: boolean;
  onClose: () => void;
  guestName: string;
  message: string;
  vehicleName?: string;
}

export function FullScreenSOS({ open, onClose, guestName, message, vehicleName }: FullScreenSOSProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    if (open) {
      // Create audio context and start alarm
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.4;
        
        oscillator.start();
        oscillatorRef.current = oscillator;

        // Beep pattern
        const beepInterval = setInterval(() => {
          if (gainNode.gain.value === 0) {
            gainNode.gain.value = 0.4;
            oscillator.frequency.value = 880;
          } else {
            gainNode.gain.value = 0;
          }
        }, 400);

        // Auto-close after 10 seconds but keep acknowledging required
        const autoMinimize = setTimeout(() => {
          // Don't auto-close, just stop the sound
          clearInterval(beepInterval);
          oscillator.stop();
        }, 10000);

        return () => {
          clearInterval(beepInterval);
          clearTimeout(autoMinimize);
          oscillator.stop();
          audioContextRef.current?.close();
        };
      } catch (e) {
        console.error('Audio not supported');
      }
    }
  }, [open]);

  const handleAcknowledge = () => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center",
        "bg-destructive animate-pulse"
      )}
      style={{ animationDuration: '1s' }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 20px,
            rgba(0,0,0,0.1) 20px,
            rgba(0,0,0,0.1) 40px
          )`
        }} />
      </div>

      <div className="relative z-10 max-w-lg w-full mx-4 text-center text-destructive-foreground space-y-6">
        {/* SOS Icon */}
        <div className="animate-bounce">
          <div className="h-32 w-32 mx-auto rounded-full bg-destructive-foreground/20 flex items-center justify-center">
            <AlertTriangle className="h-20 w-20" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-5xl font-display font-black tracking-tight">
            🚨 EMERGENCY SOS 🚨
          </h1>
          <p className="text-xl opacity-90">Immediate attention required!</p>
        </div>

        {/* Guest Info */}
        <div className="bg-destructive-foreground/10 backdrop-blur rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold">
            <span>{guestName}</span>
          </div>
          
          {vehicleName && (
            <div className="flex items-center justify-center gap-2 opacity-80">
              <Car className="h-5 w-5" />
              <span>{vehicleName}</span>
            </div>
          )}
          
          <div className="p-4 bg-destructive-foreground/10 rounded-xl">
            <p className="text-lg font-medium">"{message}"</p>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-sm opacity-70">
          The guest has triggered an emergency alert. Please check on them immediately!
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            size="lg"
            onClick={handleAcknowledge}
            className="bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90 font-bold text-lg px-8"
          >
            <Phone className="h-5 w-5 mr-2" />
            Call Guest Now
          </Button>
          <Button 
            variant="outline"
            size="lg"
            onClick={handleAcknowledge}
            className="border-destructive-foreground/50 text-destructive-foreground hover:bg-destructive-foreground/10 font-bold"
          >
            <X className="h-5 w-5 mr-2" />
            Acknowledge
          </Button>
        </div>

        {/* Timestamp */}
        <p className="text-xs opacity-50">
          Alert received at {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
