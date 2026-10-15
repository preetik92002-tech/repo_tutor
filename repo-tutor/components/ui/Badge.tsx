import React from "react";

type BadgeVariant = "orange" | "purple" | "green" | "yellow" | "muted" | "white";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const styles: Record<BadgeVariant, React.CSSProperties> = {
  orange: { background: "#FF6B35", color: "#fff" },
  purple: { background: "#7447EB", color: "#fff" },
  green: { background: "#B8E986", color: "#202020" },
  yellow: { background: "#FFD84D", color: "#202020" },
  muted: { background: "#E8DDD0", color: "#6B6557" },
  white: { background: "#fff", color: "#202020", border: "1px solid #E8DDD0" },
};

export function Badge({ children, variant = "muted", className = "" }: BadgeProps) {
  return (
    <span
      className={`badge ${className}`}
      style={styles[variant]}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: "completed" | "in_progress" | "not_started";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const map = {
    completed: { label: "Completed", variant: "green" as BadgeVariant },
    in_progress: { label: "In Progress", variant: "orange" as BadgeVariant },
    not_started: { label: "Not Started", variant: "muted" as BadgeVariant },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}
