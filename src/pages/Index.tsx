import { Shield, Car, ArrowRight, Zap, Lock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoIcon from '@/assets/logo-icon.png';

const features = [
  { icon: Lock, title: 'Secure Tokens', desc: 'Generate unique access codes with customizable limits' },
  { icon: Zap, title: 'Real-Time Monitoring', desc: 'Track speed, location, and fuel in real-time' },
  { icon: MessageSquare, title: 'Instant Alerts', desc: 'Get notified of violations and SOS calls instantly' },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoIcon} alt="AutoSentinel" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-display font-bold text-lg">AutoSentinel</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/test-car">
                <Car className="h-4 w-4 mr-2" />
                Simulator
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-section watermark-pattern">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
            <Zap className="h-4 w-4" />
            AI-Powered Vehicle Access Control
          </div>
          
          <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight">
            Safely Share Your Vehicle 
            <span className="text-gradient"> With Anyone</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Create permission tokens with custom limits. Monitor in real-time. 
            Get instant alerts. Keep your vehicles safe while sharing access.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button asChild size="lg" className="gap-2 text-lg px-8">
              <Link to="/auth">
                Start Free <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2 text-lg px-8">
              <Link to="/test-car">
                <Car className="h-5 w-5" />
                Try Simulator
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold mb-4">
              Everything You Need 🛡️
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From token creation to real-time monitoring, we've got you covered
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="card-glow border-0 shadow-sm hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Preview */}
      <section className="py-20 px-4 bg-gradient-section">
        <div className="container mx-auto max-w-4xl text-center space-y-12">
          <div>
            <h2 className="text-3xl font-display font-bold mb-4">
              Simple as 1-2-3 ✨
            </h2>
            <p className="text-muted-foreground">
              Get started in minutes, not hours
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold">Add Vehicles</h3>
              <p className="text-sm text-muted-foreground">Register your cars, bikes, or any vehicle</p>
            </div>
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold">Create Token</h3>
              <p className="text-sm text-muted-foreground">Set speed, time, and distance limits</p>
            </div>
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold">Share & Monitor</h3>
              <p className="text-sm text-muted-foreground">Track everything in real-time</p>
            </div>
          </div>

          <Button asChild size="lg" className="gap-2">
            <Link to="/auth">
              Get Started Now <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="AutoSentinel" className="h-6 w-6 rounded object-cover" />
            <span>AutoSentinel © 2026</span>
          </div>
          <p>Powered by AI for safer mobility 🚀</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
