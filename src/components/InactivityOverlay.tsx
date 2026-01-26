import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, AlertTriangle } from 'lucide-react';

interface InactivityOverlayProps {
  isActive: boolean;
  onInactivityAlert: () => void;
  timeoutMs?: number;
}

export function InactivityOverlay({ 
  isActive, 
  onInactivityAlert, 
  timeoutMs = 120000 // 2 minutes
}: InactivityOverlayProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setShowOverlay(false);
      return;
    }

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      if (showOverlay) {
        setShowOverlay(false);
        setCountdown(30);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      }
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    // Check for inactivity periodically
    checkIntervalRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity >= timeoutMs && !showOverlay) {
        setShowOverlay(true);
        setCountdown(30);
        
        // Start countdown
        countdownIntervalRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              onInactivityAlert();
              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, 10000); // Check every 10 seconds

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isActive, timeoutMs, showOverlay, onInactivityAlert]);

  const handleStillHere = () => {
    lastActivityRef.current = Date.now();
    setShowOverlay(false);
    setCountdown(30);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  if (!showOverlay) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full animate-in zoom-in-95 duration-300">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex items-center justify-center gap-2 text-warning">
            <AlertTriangle className="h-6 w-6" />
            <h2 className="text-xl font-display font-bold">Are you still there? 👋</h2>
          </div>
          
          <div className="relative h-28 w-28 mx-auto rounded-full border-4 border-warning flex items-center justify-center">
            <Clock className="h-10 w-10 text-warning" />
            <div className="absolute -bottom-3 bg-warning text-warning-foreground px-4 py-1.5 rounded-full text-lg font-bold">
              {countdown}s
            </div>
          </div>
          
          <p className="text-muted-foreground">
            We noticed you've been inactive for a while. The owner will be notified if you don't respond.
          </p>
          
          <Button onClick={handleStillHere} size="lg" className="w-full">
            I'm Still Here! 👍
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
