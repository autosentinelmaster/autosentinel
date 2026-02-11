import { Shield, Car, ArrowRight, Zap, Lock, MessageSquare, Eye, Bell, Timer, MapPin, BarChart3, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoIcon from '@/assets/logo-icon.png';

const features = [
  { icon: Lock, title: 'Secure Tokens', desc: 'Generate unique access codes with custom speed, time, distance, and geofence limits for every guest.' },
  { icon: Eye, title: 'Real-Time Monitoring', desc: 'Track speed, location, fuel, and violations live from your dashboard as guests drive.' },
  { icon: Bell, title: 'Instant Alerts', desc: 'Get notified of speed violations, geofence breaches, SOS calls, and inactivity in real-time.' },
  { icon: Timer, title: 'Session Control', desc: 'Withhold, expire, or resume tokens instantly. Full control over every active session.' },
  { icon: BarChart3, title: 'AI Summaries', desc: 'Generate detailed driving reports and accountability scores powered by AI analysis.' },
  { icon: Users, title: 'Guest History', desc: 'Track every guest with ratings, violation history, and detailed usage stats across vehicles.' },
];

const steps = [
  { num: '01', title: 'Register Vehicles', desc: 'Add your cars, bikes, or any vehicle to your fleet. Set fuel capacity and details.' },
  { num: '02', title: 'Create a Token', desc: 'Set speed, time, distance, geofence, and fuel limits. Assign to a vehicle and guest.' },
  { num: '03', title: 'Share & Monitor', desc: 'Share the token code. Watch everything live. Get alerts. Maintain full control.' },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoIcon} alt="AutoSentinel" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-display font-bold text-lg tracking-tight">AutoSentinel</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 bg-card border border-border rounded-full px-1.5 py-1">
            <Link to="/how-it-works" className="px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-full">How It Works</Link>
            <Link to="/test-car" className="px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-full">Simulator</Link>
            <Link to="/auth" className="px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-full">Sign In</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" className="rounded-full px-5">
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-8">
            <Shield className="h-4 w-4" />
            AI-Powered Vehicle Access Control
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.95] tracking-tight mb-6">
            Share Your<br />
            Vehicle.<br />
            <span className="text-gradient">Stay In Control.</span>
          </h1>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mt-8">
            <p className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed">
              Create permission tokens with custom limits. Monitor in real-time. 
              Get instant alerts. Keep your vehicles safe while sharing access.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="gap-2 text-base px-8 rounded-full">
                <Link to="/auth">
                  Start Free <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2 text-base px-8 rounded-full">
                <Link to="/test-car">
                  <Car className="h-5 w-5" />
                  Try Simulator
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border bg-card/50">
        <div className="container mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {[
              { value: 'Real-Time', label: 'Live Monitoring' },
              { value: 'AI', label: 'Smart Summaries' },
              { value: '6+', label: 'Safety Controls' },
              { value: '100%', label: 'Token Security' },
            ].map((stat, i) => (
              <div key={i} className="py-6 px-4 text-center">
                <p className="text-2xl md:text-3xl font-display font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 md:py-28 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-14">
            <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl">
              From token creation to AI-powered accountability — full control over every vehicle interaction.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <Card key={index} className="group border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
                <CardContent className="p-6 space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28 px-6 bg-gradient-section">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-14">
            <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Get started in minutes, not hours.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="relative p-6 bg-card border border-border rounded-2xl group hover:border-primary/30 transition-all">
                <span className="text-5xl font-display font-bold text-primary/15 group-hover:text-primary/25 transition-colors">{step.num}</span>
                <h3 className="text-xl font-semibold mt-2 mb-2 tracking-tight">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button asChild size="lg" className="gap-2 rounded-full px-8">
              <Link to="/auth">
                Get Started Now <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <img src={logoIcon} alt="AutoSentinel" className="h-14 w-14 rounded-2xl object-cover mx-auto mb-6" />
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight mb-4">
            Ready to take control?
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Join AutoSentinel and share your vehicles with confidence. Real-time monitoring, AI insights, and complete control — all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gap-2 text-base px-8 rounded-full">
              <Link to="/auth">
                Create Free Account <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2 text-base px-8 rounded-full">
              <Link to="/how-it-works">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <img src={logoIcon} alt="AutoSentinel" className="h-6 w-6 rounded object-cover" />
            <span>AutoSentinel &copy; 2026</span>
          </div>
          <p>AI-Powered Vehicle Access Control</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
