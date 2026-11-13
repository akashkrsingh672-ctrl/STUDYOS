"use client";

import { MAX_COUNT, MIN_COUNT, clampCount } from "@/lib/planLogic";

interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  /** "lg" = lecture counter (112x32), "sm" = question total (94x30). */
  size?: "lg" | "sm";
  min?: number;
  max?: number;
  label: string;
  disabled?: boolean;
}

/**
 * Count control matching the Figma component exactly:
 * "-" uses muted text, "+" uses accent text, value is centred.
 * Requirement 2: counts are clamped to 0–15 (no decrement below 0).
 */
export default function Stepper({
  value,
  onChange,
  size = "sm",
  min = MIN_COUNT,
  max = MAX_COUNT,
  label,
  disabled = false,
}: StepperProps) {
  const isLarge = size === "lg";
  const atMin = value <= min;
  const atMax = value >= max;

  const change = (delta: number) => {
    if (disabled) return;
    const next = clampCount(value + delta, max);
    if (next !== value) onChange(Math.max(min, next));
  };

  const buttonClass = (isDisabled: boolean) =>
    `flex items-center justify-center rounded-stepper transition-colors ${
      isLarge ? "size-[32px]" : "h-[30px] w-[28px]"
    } ${
      isDisabled
        ? "text-muted/40 cursor-not-allowed"
        : "hover:bg-surface-raised cursor-pointer"
    }`;

  return (
    <div
      className={`flex shrink-0 items-center overflow-hidden border border-border-medium bg-surface ${
        isLarge ? "h-[32px] w-[112px] rounded-soft" : "h-[30px] w-[94px] rounded-stepper"
      }`}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => change(-1)}
        disabled={disabled || atMin}
        aria-label={`Decrease ${label}`}
        className={buttonClass(disabled || atMin)}
      >
        <span
          className={`font-semibold leading-none ${isLarge ? "text-[11px]" : "text-[14px]"} ${
            disabled || atMin ? "text-muted/40" : "text-muted"
          }`}
        >
          −
        </span>
      </button>
      <span
        aria-live="polite"
        className={`flex-1 text-center font-semibold leading-none text-primary ${
          isLarge ? "text-[13px]" : "text-[12px]"
        }`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => change(1)}
        disabled={disabled || atMax}
        aria-label={`Increase ${label}`}
        className={buttonClass(disabled || atMax)}
      >
        <span
          className={`font-semibold leading-none ${isLarge ? "text-[11px]" : "text-[14px]"} ${
            disabled || atMax ? "text-muted/40" : "text-accent"
          }`}
        >
          +
        </span>
      </button>
    </div>
  );
}
