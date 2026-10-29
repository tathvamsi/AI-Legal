"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "brand" | "terracotta" | "secondary" | "outline" | "ghost" | "danger";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

export function Button({
  className,
  variant = "default",
  size = "default",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800 border border-slate-900 shadow-sm active:scale-[0.98]",
    brand: "bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 shadow-sm active:scale-[0.98]",
    terracotta: "bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 shadow-sm active:scale-[0.98]",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 shadow-subtle active:scale-[0.98]",
    outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 hover:border-slate-300 shadow-subtle active:scale-[0.98]",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700 border-transparent",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200",
  };
  const sizes = {
    default: "h-9 px-4 py-2 text-sm font-medium",
    sm: "h-7 px-2.5 text-xs font-medium",
    lg: "h-11 px-5 text-base font-medium",
    icon: "h-9 w-9 p-0",
  };
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.96 7.96 0 004 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}
