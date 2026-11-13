import type { ReactNode } from "react";

interface ArcGaugeProps {
  /** 0-100 */
  value: number;
  /** Outer box size in px (matches the Figma frames: 188 or 102). */
  size: number;
  strokeWidth?: number;
  /** Colour of the filled arc. */
  color?: string;
  /** Fraction of the ring that is visible, 1 = full ring (design default). */
  sweep?: number;
  className?: string;
  /** Rendered inside the dial (percentage, label, detail). */
  children?: ReactNode;
}

/**
 * Ring gauge matching the Figma "Track arc / Progress arc" construction: a full
 * circle with a rounded cap, drawn from 12 o'clock clockwise, with the value
 * column centred inside. Progress changes are animated so the gauge reads as
 * motion rather than a jump.
 */
export default function ArcGauge({
  value,
  size,
  strokeWidth = 12,
  color = "var(--accent)",
  sweep = 1,
  className,
  children,
}: ArcGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const visible = circumference * sweep;
  const filled = (visible * clamped) / 100;
  const rotation = -90 - 180 * (1 - sweep);

  return (
    <div
      className={`relative ${className ?? ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${clamped} percent`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <g transform={`rotate(${rotation} ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(234,244,244,0.1)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${visible} ${circumference}`}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            className="transition-[stroke-dasharray] duration-700 ease-out"
          />
        </g>
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}
