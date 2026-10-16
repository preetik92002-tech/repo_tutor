import React from "react";
import { CheckCircleIcon, CircleIcon } from "./Icons";

export type BadgeVariant =
  | "orange"
  | "purple"
  | "purple-soft"
  | "green"
  | "yellow"
  | "white"
  | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  orange: "bg-orange text-ink",
  purple: "bg-purple text-white",
  "purple-soft": "bg-purple-soft text-purple",
  green: "bg-fresh text-ink",
  yellow: "bg-sun text-ink",
  white: "bg-white text-ink",
  muted: "bg-white text-muted",
};

export function Badge({ children, variant = "white", className = "" }: BadgeProps) {
  return (
    <span className={`badge ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: "completed" | "in_progress" | "not_started";
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  if (status === "completed") {
    return (
      <span className={`badge bg-fresh text-ink ${className}`}>
        <CheckCircleIcon size={13} className="shrink-0" />
        Completed
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className={`badge bg-orange text-ink ${className}`}>
        In Progress
      </span>
    );
  }
  return (
    <span className={`badge bg-white text-muted ${className}`}>
      <CircleIcon size={12} className="shrink-0" />
      Not Started
    </span>
  );
}
