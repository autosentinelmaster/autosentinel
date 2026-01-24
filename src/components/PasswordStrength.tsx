import { useMemo } from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
}

interface Requirement {
  label: string;
  met: boolean;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const requirements: Requirement[] = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains number', met: /\d/.test(password) },
    { label: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ], [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    if (metCount === 5) return { label: 'Strong', color: 'bg-success', percentage: 100 };
    if (metCount >= 3) return { label: 'Medium', color: 'bg-warning', percentage: 60 };
    if (metCount >= 1) return { label: 'Weak', color: 'bg-destructive', percentage: 30 };
    return { label: 'Very Weak', color: 'bg-destructive/50', percentage: 10 };
  }, [requirements]);

  if (!password) return null;

  return (
    <div className="space-y-3 animate-in">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={`font-medium ${
            strength.label === 'Strong' ? 'text-success' : 
            strength.label === 'Medium' ? 'text-warning' : 'text-destructive'
          }`}>{strength.label}</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${strength.percentage}%` }}
          />
        </div>
      </div>

      {/* Requirements list */}
      <div className="grid grid-cols-1 gap-1.5">
        {requirements.map((req, idx) => (
          <div 
            key={idx}
            className={`flex items-center gap-2 text-xs transition-colors ${
              req.met ? 'text-success' : 'text-muted-foreground'
            }`}
          >
            {req.met ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            {req.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain an uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain a lowercase letter' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain a number' };
  }
  return { valid: true, message: '' };
}