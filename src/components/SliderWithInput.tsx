import { useState, useEffect, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

interface SliderWithInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  /** Number of decimal places for display */
  precision?: number;
  unit?: string;
  /** If true, allows typing values beyond the slider min/max to auto-scale */
  allowOverflow?: boolean;
}

export function SliderWithInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  precision = 1,
  unit = "",
  allowOverflow = true,
}: SliderWithInputProps) {
  const [inputValue, setInputValue] = useState(value.toFixed(precision));
  const [effectiveMax, setEffectiveMax] = useState(max);
  const [effectiveMin, setEffectiveMin] = useState(min);

  useEffect(() => {
    setInputValue(value.toFixed(precision));
    // Auto-scale slider range if value exceeds bounds
    if (allowOverflow) {
      if (value > max) setEffectiveMax(Math.ceil(value * 1.5 / step) * step);
      else setEffectiveMax(max);
      if (value < min) setEffectiveMin(Math.floor(value * 1.5 / step) * step);
      else setEffectiveMin(min);
    }
  }, [value, precision, max, min, allowOverflow, step]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = useCallback(() => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      // Clamp to a reasonable range but allow values beyond slider defaults
      const clamped = allowOverflow ? parsed : Math.max(min, Math.min(max, parsed));
      onChange(clamped);
      setInputValue(clamped.toFixed(precision));
    } else {
      setInputValue(value.toFixed(precision));
    }
  }, [inputValue, allowOverflow, min, max, onChange, precision, value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleInputBlur();
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground block">
        {label}{unit ? ` (${unit})` : ""}
      </label>
      <Slider
        value={[Math.max(effectiveMin, Math.min(effectiveMax, value))]}
        onValueChange={([v]) => onChange(v)}
        min={effectiveMin}
        max={effectiveMax}
        step={step}
      />
      <Input
        type="number"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        step={step}
        className="h-7 text-xs font-mono bg-muted/30 border-border/50 text-foreground w-full"
      />
    </div>
  );
}
