import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

export function HowItWorksButton() {
  return (
    <Link to="/how-it-works">
      <Button variant="ghost" size="sm" className="gap-2">
        <HelpCircle className="h-4 w-4" />
        <span className="hidden sm:inline">How It Works</span>
      </Button>
    </Link>
  );
}
