"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-gbus-primary to-gbus-primary-light text-white shadow-[0_2px_12px_rgba(124,109,240,0.3)] hover:shadow-[0_4px_20px_rgba(124,109,240,0.45)] hover:brightness-110",
  secondary:
    "bg-gbus-surface-light/80 backdrop-blur-sm hover:bg-gbus-border/60 text-gbus-text border border-gbus-border/60 hover:border-gbus-text-dim",
  danger:
    "bg-gbus-danger/15 hover:bg-gbus-danger/25 text-gbus-danger border border-gbus-danger/25 hover:border-gbus-danger/50",
  ghost:
    "bg-transparent hover:bg-gbus-surface-light/60 text-gbus-text-muted hover:text-gbus-text",
  accent:
    "bg-gradient-to-r from-gbus-accent to-gbus-accent-light text-gbus-bg shadow-[0_2px_12px_rgba(0,210,198,0.3)] hover:shadow-[0_4px_20px_rgba(0,210,198,0.45)] hover:brightness-110",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer active:scale-[0.97] ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
