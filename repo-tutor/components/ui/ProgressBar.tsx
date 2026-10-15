import React from "react";

interface ProgressBarProps {
  value: number; // 0–100
  color?: string;
  height?: number;
  label?: string;
}

export function ProgressBar({
  value,
  color = "var(--orange)",
  height = 8,
  label,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs mb-1" style={{ color: "var(--ink-muted)" }}>
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ background: "var(--border)", height }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
