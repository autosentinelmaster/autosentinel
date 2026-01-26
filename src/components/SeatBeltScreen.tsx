import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

interface SeatBeltScreenProps {
  onConfirm: () => void;
  guestName: string;
  carName?: string;
}

export function SeatBeltScreen({ onConfirm, guestName, carName }: SeatBeltScreenProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full animate-in zoom-in-95 duration-300">
        <CardContent className="p-8 text-center space-y-6">
          <div className="mx-auto h-24 w-24 rounded-full bg-warning/20 flex items-center justify-center">
            <ShieldCheck className="h-12 w-12 text-warning" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold">Safety First, {guestName}!</h2>
            {carName && (
              <p className="text-primary font-medium">Vehicle: {carName}</p>
            )}
            <p className="text-muted-foreground">
              Before you start driving, please ensure your seat belt is properly fastened.
            </p>
          </div>
          
          <div className="p-4 bg-secondary/50 rounded-lg text-sm text-muted-foreground text-left">
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span> Adjust your seat and mirrors
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span> Fasten your seat belt securely
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span> Ensure all passengers are buckled up
              </li>
              <li className="flex items-center gap-2">
                <span className="text-success">✓</span> Check fuel level before starting
              </li>
            </ul>
          </div>
          
          <Button onClick={onConfirm} className="w-full" size="lg">
            <ShieldCheck className="h-5 w-5 mr-2" />
            I've Fastened My Seat Belt
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
