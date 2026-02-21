type Variant = "default" | "success" | "warning" | "danger" | "accent";

const variantClasses: Record<Variant, string> = {
  default: "bg-gbus-surface-light text-gbus-text-muted border-gbus-border",
  success: "bg-gbus-success/15 text-gbus-success border-gbus-success/30",
  warning: "bg-gbus-warning/15 text-gbus-warning border-gbus-warning/30",
  danger: "bg-gbus-danger/15 text-gbus-danger border-gbus-danger/30",
  accent: "bg-gbus-accent/15 text-gbus-accent border-gbus-accent/30",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
