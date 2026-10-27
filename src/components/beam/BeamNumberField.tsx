import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";

interface BeamNumberFieldProps {
  label: ReactNode;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  className?: string;
  inputClassName?: string;
}

function formatValue(value: number, precision: number) {
  return Number.isFinite(value) ? Number(value.toFixed(precision)).toString() : "";
}

export function BeamNumberField({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step = 0.01,
  precision = 3,
  className = "",
  inputClassName = "",
}: BeamNumberFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(() => formatValue(value, precision));

  useLayoutEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDraft(formatValue(value, precision));
    }
  }, [value, precision]);

  const clamp = (next: number) => {
    let clamped = next;
    if (min !== undefined) clamped = Math.max(min, clamped);
    if (max !== undefined) clamped = Math.min(max, clamped);
    return clamped;
  };

  const isInRange = (next: number) =>
    (min === undefined || next >= min) && (max === undefined || next <= max);

  const commit = () => {
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isFinite(parsed)) {
      setDraft(formatValue(value, precision));
      return;
    }

    const next = clamp(parsed);
    onChange(next);
    setDraft(formatValue(next, precision));
  };

  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          aria-label={typeof label === "string" ? label : undefined}
          value={draft}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const nextDraft = event.currentTarget.value;
            setDraft(nextDraft);
            if (!nextDraft.trim()) return;
            const parsed = Number(nextDraft);
            if (Number.isFinite(parsed) && isInRange(parsed)) onChange(parsed);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commit();
              event.currentTarget.blur();
            }
          }}
          className={`bg-muted/30 border-border ${inputClassName}`}
        />
        {unit && <span className="shrink-0 text-xs text-muted-foreground">{unit}</span>}
      </div>
    </label>
  );
}
