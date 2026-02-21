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
          className={`w-full px-3 py-2 bg-gbus-surface border border-gbus-border rounded-lg text-gbus-text placeholder:text-gbus-text-dim focus:outline-none focus:border-gbus-primary focus:ring-1 focus:ring-gbus-primary transition-colors ${error ? "border-gbus-danger" : ""} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-gbus-danger">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
