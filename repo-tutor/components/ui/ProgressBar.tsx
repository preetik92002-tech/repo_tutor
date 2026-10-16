import React from "react";

interface ProgressBarProps {
  value: number; // 0–100
  color?: string;
  height?: number;
  label?: string;
}

export function ProgressBar({
  value,
  color = "var(--green)",
  height = 16,
  label,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs font-bold mb-1.5 text-muted">
          <span>{label}</span>
          <span className="font-mono text-ink">{pct}%</span>
        </div>
      )}
      <div
        className="w-full rounded-full border-2 border-ink bg-white overflow-hidden"
        style={{ height }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Course progress"}
      >
        <div
          className="h-full transition-[width] duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
