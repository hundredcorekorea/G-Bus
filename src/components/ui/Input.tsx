"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-gbus-text-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-2.5 bg-gbus-surface/80 backdrop-blur-sm border border-gbus-border/60 rounded-xl text-gbus-text placeholder:text-gbus-text-dim focus:outline-none focus:border-gbus-primary focus:ring-2 focus:ring-gbus-primary/20 focus:shadow-[0_0_12px_rgba(124,109,240,0.15)] transition-all duration-200 ${
            error ? "border-gbus-danger focus:border-gbus-danger focus:ring-gbus-danger/20" : ""
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-gbus-danger">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
