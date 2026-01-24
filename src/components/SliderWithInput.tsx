import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReactNode } from 'react';

interface SliderWithInputProps {
  label: string;
  icon?: ReactNode;
  value: number[];
  onChange: (value: number[]) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  helpText?: string;
}

export function SliderWithInput({
  label,
  icon,
  value,
  onChange,
  min,
  max,
  step,
  unit = '',
  helpText
}: SliderWithInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || min;
    const clampedValue = Math.max(min, Math.min(max, newValue));
    onChange([clampedValue]);
  };

  return (
    <div className="space-y-3 animate-in stagger-1">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {icon}
          {label}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value[0]}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={step}
            className="w-20 h-8 text-center text-sm font-semibold"
          />
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
      </div>
      <Slider
        value={value}
        onValueChange={onChange}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}