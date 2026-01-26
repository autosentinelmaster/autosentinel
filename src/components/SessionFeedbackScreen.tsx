import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Car, Star } from 'lucide-react';

interface SessionFeedbackScreenProps {
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

export function SessionFeedbackScreen({ onClose, onSubmit, vehicleName }: SessionFeedbackScreenProps) {
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
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full animate-in zoom-in-95 duration-300">
        <CardContent className="p-8 space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Car className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-display font-bold">How was your ride? 🚗</h2>
            </div>
            {vehicleName && (
              <p className="text-muted-foreground">
                Thanks for using <span className="font-medium text-foreground">{vehicleName}</span>!
              </p>
            )}
          </div>
          
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
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
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
        </CardContent>
      </Card>
    </div>
  );
}
