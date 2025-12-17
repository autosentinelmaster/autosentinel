import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="text-center space-y-6 max-w-lg">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Shield className="h-14 w-14 text-primary" />
        </div>
        <h1 className="text-4xl font-bold text-gradient">Auto Sentinel</h1>
        <p className="text-lg text-muted-foreground">
          AI-Controlled Access & Delegation for Safer Mobility
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
          <Button asChild size="lg">
            <Link to="/auth">Access Control Panel</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/test-car">Test Car Simulator</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-8">
          © 2026 AutoSentinel. Powered by AI for safer mobility.
        </p>
      </div>
    </div>
  );
};

export default Index;