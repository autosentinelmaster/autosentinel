import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  HelpCircle, Shield, Car, Key, AlertTriangle, MessageSquare,
  Gauge, Clock, MapPin, Fuel, Bell, Play, Square, User,
  CheckCircle, XCircle, ArrowRight, Smartphone
} from 'lucide-react';

interface StepItem {
  icon: typeof HelpCircle;
  title: string;
  desc: string;
  details?: string[];
}

export function HowItWorksGuide() {
  const [open, setOpen] = useState(false);

  const ownerSteps: StepItem[] = [
    { 
      icon: Car, 
      title: '1. Register Your Vehicles', 
      desc: 'Add vehicles you want to share with guests',
      details: [
        'Click "Add Vehicle" in the Vehicles section',
        'Enter vehicle name, make, model, and license plate',
        'Set fuel capacity for monitoring'
      ]
    },
    { 
      icon: Key, 
      title: '2. Create a Permission Token 🔑', 
      desc: 'Set limits and generate a unique code',
      details: [
        'Click "Create New Token"',
        'Select which vehicle to assign',
        'Set speed limit, time limit, distance limit',
        'Set geofence radius and fuel limit',
        'Set how long the token is valid'
      ]
    },
    { 
      icon: Smartphone, 
      title: '3. Share with Guest 📲', 
      desc: 'Send the token code via your preferred method',
      details: [
        'Copy the token code',
        'Share via WhatsApp, Email, or any messenger',
        'Guest enters the code in the simulator'
      ]
    },
    { 
      icon: Bell, 
      title: '4. Monitor in Real-Time 📊', 
      desc: 'Watch live updates and receive alerts',
      details: [
        'See current speed, distance, fuel level',
        'Receive alerts for violations',
        'Get SOS notifications instantly',
        'Chat with guest for any issues'
      ]
    },
    { 
      icon: Shield, 
      title: '5. Manage & Control', 
      desc: 'Withhold, expire, or manage tokens anytime',
      details: [
        'Withhold token temporarily to pause access',
        'Expire token to permanently disable',
        'View session history and violations',
        'Generate AI-powered session summaries'
      ]
    },
  ];

  const guestSteps: StepItem[] = [
    { 
      icon: Key, 
      title: '1. Receive Token Code', 
      desc: 'Get the code from the vehicle owner',
      details: [
        'Owner will share a 12-character code',
        'Format: XXXX-XXXX-XXXX',
        'Keep it safe until ready to drive'
      ]
    },
    { 
      icon: Play, 
      title: '2. Start Your Session', 
      desc: 'Enter code and begin driving',
      details: [
        'Go to the Vehicle Simulator',
        'Enter your token code',
        'Confirm seat belt safety check',
        'Click "Start Drive" to begin'
      ]
    },
    { 
      icon: Gauge, 
      title: '3. Stay Within Limits ⚡', 
      desc: 'Respect the boundaries set by owner',
      details: [
        'Speed: Stay below the limit shown',
        'Distance: Don\'t exceed the allowed km',
        'Time: Return before time runs out',
        'Geofence: Stay inside the allowed area',
        'Fuel: Monitor fuel consumption'
      ]
    },
    { 
      icon: MessageSquare, 
      title: '4. Communicate 💬', 
      desc: 'Use built-in messaging for any needs',
      details: [
        'Send messages to request extensions',
        'Report any issues with the vehicle',
        'Use SOS in emergencies only!'
      ]
    },
    { 
      icon: Square, 
      title: '5. End Session ✅', 
      desc: 'Stop driving and optionally return token',
      details: [
        'Click "Stop" when done driving',
        'Optionally return token early',
        'Provide feedback on your experience'
      ]
    },
  ];

  const controlsExplained = [
    { icon: Gauge, name: 'Speed Limit', desc: 'Maximum allowed speed in km/h. Exceeding triggers an alert to owner.' },
    { icon: Clock, name: 'Time Limit', desc: 'How long the guest can actively drive. Pausing doesn\'t count against time.' },
    { icon: MapPin, name: 'Distance Limit', desc: 'Maximum distance in km the vehicle can travel.' },
    { icon: MapPin, name: 'Geofence', desc: 'Circular boundary. Guest must stay inside this radius from the center point.' },
    { icon: Fuel, name: 'Fuel Limit', desc: 'Alerts when fuel drops below the set percentage.' },
    { icon: Clock, name: 'Token Validity', desc: 'How long the token remains usable (e.g., 24 hours). Different from driving time.' },
  ];

  const alertTypes = [
    { icon: Gauge, name: 'Speed Violation', desc: 'Guest exceeded the speed limit', color: 'text-destructive' },
    { icon: MapPin, name: 'Geofence Breach', desc: 'Vehicle left the allowed area', color: 'text-destructive' },
    { icon: MapPin, name: 'Distance Exceeded', desc: 'Traveled beyond allowed distance', color: 'text-warning' },
    { icon: Fuel, name: 'Low Fuel', desc: 'Fuel level dropped below threshold', color: 'text-warning' },
    { icon: AlertTriangle, name: 'Sudden Stop', desc: 'Possible accident detected', color: 'text-destructive' },
    { icon: AlertTriangle, name: 'SOS Alert', desc: 'Emergency alert from guest', color: 'text-destructive' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">How It Works</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-6 w-6 text-primary" />
            AutoSentinel Guide 📖
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="owner" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="owner" className="gap-1">
              <User className="h-4 w-4" /> Owner
            </TabsTrigger>
            <TabsTrigger value="guest" className="gap-1">
              <Car className="h-4 w-4" /> Guest
            </TabsTrigger>
            <TabsTrigger value="reference" className="gap-1">
              <HelpCircle className="h-4 w-4" /> Reference
            </TabsTrigger>
          </TabsList>

          <TabsContent value="owner" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Welcome, Owner! 👋 Here's how to safely delegate vehicle access:
            </p>
            {ownerSteps.map((step, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-base">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.desc}</p>
                      {step.details && (
                        <ul className="mt-2 space-y-1">
                          {step.details.map((detail, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <ArrowRight className="h-3 w-3 mt-1.5 text-primary flex-shrink-0" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="guest" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Hey Guest! 👋 Here's how to use your driving token:
            </p>
            {guestSteps.map((step, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-base">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.desc}</p>
                      {step.details && (
                        <ul className="mt-2 space-y-1">
                          {step.details.map((detail, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <CheckCircle className="h-3 w-3 mt-1.5 text-success flex-shrink-0" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="reference" className="mt-4 space-y-6">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                Controls & Limits Explained
              </h3>
              <div className="grid gap-2">
                {controlsExplained.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <item.icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Alert Types
              </h3>
              <div className="grid gap-2">
                {alertTypes.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <item.icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${item.color}`} />
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
