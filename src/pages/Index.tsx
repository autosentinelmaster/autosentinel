import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-lg">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Shield className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-5xl font-display font-bold text-gradient">Auto Sentinel</h1>
        <p className="text-xl text-muted-foreground">
          AI-Controlled Access & Delegation for Safer Mobility
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <Button asChild size="xl">
            <Link to="/auth">Access Control Panel</Link>
          </Button>
          <Button asChild variant="outline" size="xl">
            <Link to="/test-car">Test Car Simulator</Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground pt-8">
          © 2024 AutoSentinel. Powered by AI for safer mobility.
        </p>
      </div>
    </div>
  );
};

export default Index;
