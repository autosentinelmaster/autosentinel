import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';

interface SeatBeltDialogProps {
  open: boolean;
  onConfirm: () => void;
  guestName: string;
  carName?: string;
}

export function SeatBeltDialog({ open, onConfirm, guestName, carName }: SeatBeltDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-warning/20 flex items-center justify-center">
            <ShieldCheck className="h-10 w-10 text-warning" />
          </div>
          <DialogTitle className="text-2xl font-display">Safety First, {guestName}!</DialogTitle>
          <DialogDescription className="text-base">
            {carName && <span className="block text-primary font-medium mb-2">Vehicle: {carName}</span>}
            Before you start driving, please ensure your seat belt is properly fastened.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="p-4 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
            <ul className="space-y-2">
              <li>✓ Adjust your seat and mirrors</li>
              <li>✓ Fasten your seat belt securely</li>
              <li>✓ Ensure all passengers are buckled up</li>
              <li>✓ Check fuel level before starting</li>
            </ul>
          </div>
          <Button onClick={onConfirm} className="w-full" size="lg">
            <ShieldCheck className="h-5 w-5 mr-2" />
            I've Fastened My Seat Belt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
