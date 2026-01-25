import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle } from 'lucide-react';

interface InactivityDetectorProps {
  isActive: boolean;
  onInactivityAlert: () => void;
  timeoutMs?: number;
}

export function InactivityDetector({ 
  isActive, 
  onInactivityAlert, 
  timeoutMs = 120000 // 2 minutes
}: InactivityDetectorProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setShowDialog(false);
      return;
    }

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      if (showDialog) {
        setShowDialog(false);
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
      if (timeSinceActivity >= timeoutMs && !showDialog) {
        setShowDialog(true);
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
  }, [isActive, timeoutMs, showDialog, onInactivityAlert]);

  const handleStillHere = () => {
    lastActivityRef.current = Date.now();
    setShowDialog(false);
    setCountdown(30);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Are you still there? 👋
          </DialogTitle>
        </DialogHeader>
        <div className="py-6 text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="relative h-24 w-24 rounded-full border-4 border-warning flex items-center justify-center">
              <Clock className="h-8 w-8 text-warning" />
              <div className="absolute -bottom-2 bg-warning text-warning-foreground px-3 py-1 rounded-full text-sm font-bold">
                {countdown}s
              </div>
            </div>
          </div>
          <p className="text-muted-foreground">
            We noticed you've been inactive for a while. The owner will be notified if you don't respond.
          </p>
          <Button onClick={handleStillHere} size="lg" className="w-full">
            I'm Still Here! 👍
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
