import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, User, Mail, Phone, Lock, Eye, EyeOff, Shield, Key } from 'lucide-react';
import { toast } from 'sonner';
import { PasswordStrength, validatePassword } from '@/components/PasswordStrength';
import { ThemeToggle } from '@/components/ThemeToggle';

type AuthMode = 'owner' | 'token';
type AuthStep = 'login' | 'register';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('owner');
  const [step, setStep] = useState<AuthStep>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      toast.error(passwordValidation.message);
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password, fullName, phone);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Account created successfully!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTokenAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error('Please enter a valid token');
      return;
    }
    // Navigate to guest view with token
    navigate(`/child?token=${token.replace(/\s/g, '').toUpperCase()}`);
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset email sent! Check your inbox.');
      setForgotPasswordOpen(false);
      setResetEmail('');
    }
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md space-y-6 animate-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-display font-bold text-gradient">Auto Sentinel</h1>
          </div>
          <p className="text-muted-foreground">AI-Controlled Access for Safer Mobility</p>
        </div>

        <Card className="card-glow">
          <CardHeader className="pb-4">
            {step === 'register' && (
              <button 
                onClick={() => setStep('login')}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </button>
            )}
            <CardTitle className="text-2xl font-display">
              {step === 'login' ? 'Welcome Back' : 'Create Owner Account'}
            </CardTitle>
            <CardDescription>
              {step === 'login' 
                ? mode === 'owner' 
                  ? 'Access your control panel to manage vehicle permissions' 
                  : 'Enter your access token to unlock the vehicle'
                : 'Register as a vehicle owner to manage access and monitor usage'
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 'login' && (
              <>
                {/* Mode Tabs */}
                <div className="flex bg-secondary rounded-lg p-1 gap-1">
                  <Button
                    variant="tab"
                    data-active={mode === 'owner'}
                    className="flex-1 gap-2"
                    onClick={() => setMode('owner')}
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Owner</span>
                  </Button>
                  <Button
                    variant="tab"
                    data-active={mode === 'token'}
                    className="flex-1 gap-2"
                    onClick={() => setMode('token')}
                  >
                    <Key className="h-4 w-4" />
                    <span className="hidden sm:inline">Guest Token</span>
                  </Button>
                </div>

                {mode === 'owner' ? (
                  <form onSubmit={handleOwnerLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-11"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                          <DialogTrigger asChild>
                            <button type="button" className="text-xs text-primary hover:underline">
                              Forgot password?
                            </button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reset Password</DialogTitle>
                              <DialogDescription>
                                Enter your email address and we'll send you a link to reset your password.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="resetEmail">Email Address</Label>
                                <Input
                                  id="resetEmail"
                                  type="email"
                                  placeholder="john@example.com"
                                  value={resetEmail}
                                  onChange={(e) => setResetEmail(e.target.value)}
                                />
                              </div>
                              <Button 
                                onClick={handleForgotPassword} 
                                disabled={resetLoading}
                                className="w-full"
                              >
                                {resetLoading ? 'Sending...' : 'Send Reset Link'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-11 pr-11"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                      {loading ? 'Signing in...' : 'Access Control Panel →'}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setStep('register')}
                        className="text-primary hover:underline"
                      >
                        Create Account
                      </button>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleTokenAccess} className="space-y-4">
                    <Card className="bg-secondary/50 border-border/50">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Key className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">Guest Token Access</h4>
                            <p className="text-sm text-muted-foreground">Enter the token shared by the owner</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="token">Access Token</Label>
                          <Input
                            id="token"
                            type="text"
                            placeholder="XXXX-XXXX-XXXX"
                            value={token}
                            onChange={(e) => setToken(e.target.value.toUpperCase())}
                            className="token-input"
                            maxLength={14}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-secondary/50 border-border/50">
                      <CardContent className="p-4 text-center text-sm text-muted-foreground">
                        Tokens are single-use and expire after the set time limit. 
                        Violations will be reported to the vehicle owner.
                      </CardContent>
                    </Card>

                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                      Verify & Access →
                    </Button>
                  </form>
                )}
              </>
            )}

            {step === 'register' && (
              <form onSubmit={handleOwnerRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regEmail">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="regEmail"
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regPhone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="regPhone"
                      type="tel"
                      placeholder="+91 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regPassword">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="regPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regConfirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="regConfirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-11 pr-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>

                <Card className="bg-secondary/50 border-border/50">
                  <CardContent className="p-4 flex gap-3 items-start">
                    <div className="h-6 w-6 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your account will have full control over vehicle access, including creating guest tokens, setting restrictions, and receiving violation alerts.
                    </p>
                  </CardContent>
                </Card>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Owner Account'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <footer className="text-center text-sm text-muted-foreground">
          <p>© 2024 AutoSentinel. All rights reserved.</p>
          <p>Powered by AI for safer mobility</p>
        </footer>
      </div>
    </div>
  );
}