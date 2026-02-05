 import { useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Textarea } from '@/components/ui/textarea';
 import { HandHelping, Clock, MapPin, Gauge, Fuel } from 'lucide-react';
 import { toast } from 'sonner';
 
 interface ExtensionRequestDialogProps {
   tokenCode: string;
   sessionSecret: string;
   currentLimits: {
     time_limit_minutes: number;
     distance_limit_km: number;
     speed_limit: number;
     fuel_limit_percent: number;
     geofence_radius_km: number;
   };
 }
 
 const REQUEST_TYPES = [
   { value: 'time', label: 'More Time', icon: Clock, unit: 'minutes' },
   { value: 'distance', label: 'More Distance', icon: MapPin, unit: 'km' },
   { value: 'speed', label: 'Higher Speed Limit', icon: Gauge, unit: 'km/h' },
   { value: 'fuel', label: 'Higher Fuel Limit', icon: Fuel, unit: '%' },
   { value: 'geofence', label: 'Larger Geofence', icon: MapPin, unit: 'km' },
 ];
 
 export function ExtensionRequestDialog({ tokenCode, sessionSecret, currentLimits }: ExtensionRequestDialogProps) {
   const [open, setOpen] = useState(false);
   const [requestType, setRequestType] = useState<string>('');
   const [requestedValue, setRequestedValue] = useState('');
   const [message, setMessage] = useState('');
   const [sending, setSending] = useState(false);
 
   const getCurrentValue = (type: string): number => {
     switch (type) {
       case 'time': return currentLimits.time_limit_minutes;
       case 'distance': return Number(currentLimits.distance_limit_km);
       case 'speed': return currentLimits.speed_limit;
       case 'fuel': return currentLimits.fuel_limit_percent;
       case 'geofence': return Number(currentLimits.geofence_radius_km);
       default: return 0;
     }
   };
 
   const getUnit = (type: string): string => {
     return REQUEST_TYPES.find(t => t.value === type)?.unit || '';
   };
 
   const handleSubmit = async () => {
     if (!requestType || !requestedValue) {
       toast.error('Please fill in all fields');
       return;
     }
 
     const numValue = parseFloat(requestedValue);
     if (isNaN(numValue) || numValue <= getCurrentValue(requestType)) {
       toast.error('Requested value must be higher than current limit');
       return;
     }
 
     setSending(true);
     const { data, error } = await supabase.rpc('send_extension_request', {
       p_token_code: tokenCode,
       p_session_secret: sessionSecret,
       p_request_type: requestType,
       p_requested_value: numValue,
       p_message: message || null
     });
 
     setSending(false);
 
     if (data) {
       toast.success('Extension request sent to owner!');
       setOpen(false);
       setRequestType('');
       setRequestedValue('');
       setMessage('');
     } else {
       toast.error('Failed to send request');
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={setOpen}>
       <DialogTrigger asChild>
         <Button variant="outline" size="sm">
           <HandHelping className="h-4 w-4 mr-1" />
           <span className="hidden sm:inline">Request</span>
         </Button>
       </DialogTrigger>
       <DialogContent className="sm:max-w-md">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <HandHelping className="h-5 w-5 text-primary" />
             Request Extension
           </DialogTitle>
         </DialogHeader>
         <div className="space-y-4">
           <div className="space-y-2">
             <Label>What do you need?</Label>
             <Select value={requestType} onValueChange={setRequestType}>
               <SelectTrigger>
                 <SelectValue placeholder="Select what you need" />
               </SelectTrigger>
               <SelectContent>
                 {REQUEST_TYPES.map(type => {
                   const Icon = type.icon;
                   return (
                     <SelectItem key={type.value} value={type.value}>
                       <span className="flex items-center gap-2">
                         <Icon className="h-4 w-4" />
                         {type.label}
                       </span>
                     </SelectItem>
                   );
                 })}
               </SelectContent>
             </Select>
           </div>
 
           {requestType && (
             <>
               <div className="p-3 bg-secondary/50 rounded-lg text-sm">
                 <p className="text-muted-foreground">Current limit: <span className="font-medium text-foreground">{getCurrentValue(requestType)} {getUnit(requestType)}</span></p>
               </div>
 
               <div className="space-y-2">
                 <Label>Requested value ({getUnit(requestType)})</Label>
                 <Input
                   type="number"
                   placeholder={`Enter new ${getUnit(requestType)}`}
                   value={requestedValue}
                   onChange={(e) => setRequestedValue(e.target.value)}
                   min={getCurrentValue(requestType) + 1}
                 />
               </div>
 
               <div className="space-y-2">
                 <Label>Reason (optional)</Label>
                 <Textarea
                   placeholder="Why do you need this extension?"
                   value={message}
                   onChange={(e) => setMessage(e.target.value)}
                   maxLength={200}
                   rows={2}
                 />
               </div>
             </>
           )}
 
           <div className="flex gap-2 pt-2">
             <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
               Cancel
             </Button>
             <Button onClick={handleSubmit} disabled={sending || !requestType || !requestedValue} className="flex-1">
               {sending ? 'Sending...' : 'Send Request'}
             </Button>
           </div>
         </div>
       </DialogContent>
     </Dialog>
   );
 }