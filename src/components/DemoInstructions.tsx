import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HelpCircle, ChevronRight, Shield, Car, Key, AlertTriangle } from 'lucide-react';

interface DemoInstructionsProps {
  variant: 'owner' | 'guest' | 'simulator';
}

export function DemoInstructions({ variant }: DemoInstructionsProps) {
  const [open, setOpen] = useState(false);

  const ownerSteps = [
    { icon: Shield, title: 'Register Your Vehicles', desc: 'Add your cars with their details in the "My Vehicles" section' },
    { icon: Key, title: 'Create a Token', desc: 'Click "Create New Driving Token", select a car, set limits, and generate' },
    { icon: Car, title: 'Share with Guest', desc: 'Copy the token code or share via the share menu' },
    { icon: AlertTriangle, title: 'Monitor in Real-Time', desc: 'Watch the dashboard for live session updates and alerts' },
  ];

  const guestSteps = [
    { icon: Key, title: 'Receive Token', desc: 'Get the token code from the vehicle owner' },
    { icon: Car, title: 'Go to Car Simulator', desc: 'Navigate to /test-car to start the simulation' },
    { icon: Shield, title: 'Enter Token', desc: 'Input the token code to unlock the vehicle' },
    { icon: AlertTriangle, title: 'Drive Safely', desc: 'Stay within limits - violations alert the owner!' },
  ];

  const simulatorSteps = [
    { icon: Key, title: 'Enter Token Code', desc: 'Use the token provided by the owner to unlock the car' },
    { icon: Shield, title: 'Confirm Seat Belt', desc: 'Acknowledge the safety popup before starting' },
    { icon: Car, title: 'Start Driving', desc: 'Click "Start Drive" to begin your session' },
    { icon: AlertTriangle, title: 'Use Controls', desc: 'Adjust speed, move on map, monitor fuel. Use SOS if needed!' },
  ];

  const steps = variant === 'owner' ? ownerSteps : variant === 'guest' ? guestSteps : simulatorSteps;
  const title = variant === 'owner' 
    ? 'Owner Dashboard Guide' 
    : variant === 'guest' 
      ? 'Guest Access Guide' 
      : 'Car Simulator Guide';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <HelpCircle className="h-4 w-4" />
          How it works
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-primary">Step {index + 1}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <h4 className="font-medium">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-sm">
            <p className="font-medium text-primary">💡 Pro Tip</p>
            {variant === 'owner' && (
              <p className="text-muted-foreground">Open /test-car in another tab to simulate a guest driving!</p>
            )}
            {variant === 'guest' && (
              <p className="text-muted-foreground">Use the Message Owner button for non-urgent communication.</p>
            )}
            {variant === 'simulator' && (
              <p className="text-muted-foreground">The SOS button sends an immediate alert with sound to the owner!</p>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
