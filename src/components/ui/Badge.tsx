type Variant = "default" | "success" | "warning" | "danger" | "accent" | "primary";

const variantClasses: Record<Variant, string> = {
  default: "bg-gbus-surface-light/80 text-gbus-text-muted border-gbus-border/60",
  success: "bg-gbus-success/10 text-gbus-success border-gbus-success/25",
  warning: "bg-gbus-warning/10 text-gbus-warning border-gbus-warning/25",
  danger: "bg-gbus-danger/10 text-gbus-danger border-gbus-danger/25",
  accent: "bg-gbus-accent/10 text-gbus-accent border-gbus-accent/25",
  primary: "bg-gbus-primary/10 text-gbus-primary-light border-gbus-primary/25",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border backdrop-blur-sm ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
