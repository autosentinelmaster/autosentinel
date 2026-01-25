import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Car, Star } from 'lucide-react';

interface SessionFeedbackProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (feedback: { emoji: string; comment: string }) => void;
  vehicleName?: string;
}

const emojis = [
  { emoji: '😀', label: 'Great!' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😕', label: 'Not great' },
  { emoji: '😞', label: 'Poor' },
];

export function SessionFeedback({ open, onClose, onSubmit, vehicleName }: SessionFeedbackProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (selectedEmoji) {
      onSubmit({ emoji: selectedEmoji, comment });
      setSelectedEmoji(null);
      setComment('');
      onClose();
    }
  };

  const handleSkip = () => {
    setSelectedEmoji(null);
    setComment('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Car className="h-5 w-5 text-primary" />
            How was your ride? 🚗
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-6">
          {vehicleName && (
            <p className="text-center text-muted-foreground">
              Thanks for using <span className="font-medium text-foreground">{vehicleName}</span>!
            </p>
          )}
          
          <div className="flex justify-center gap-3">
            {emojis.map((item) => (
              <button
                key={item.emoji}
                onClick={() => setSelectedEmoji(item.emoji)}
                className={`text-4xl p-2 rounded-xl transition-all duration-200 ${
                  selectedEmoji === item.emoji 
                    ? 'bg-primary/20 scale-110 shadow-md' 
                    : 'hover:bg-secondary hover:scale-105'
                }`}
                title={item.label}
              >
                {item.emoji}
              </button>
            ))}
          </div>

          {selectedEmoji && (
            <div className="space-y-2 animate-in">
              <p className="text-sm text-muted-foreground">
                Want to share more? (optional)
              </p>
              <Textarea
                placeholder="Tell us about your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSkip} className="flex-1">
              Skip
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="flex-1"
              disabled={!selectedEmoji}
            >
              <Star className="h-4 w-4 mr-2" />
              Submit Feedback
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
