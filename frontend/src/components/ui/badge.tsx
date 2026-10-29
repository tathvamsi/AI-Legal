"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "brand" | "terracotta" | "open" | "closed" | "archived" | "private" | "shared" | "success" | "warning" | "danger";
  dot?: boolean;
}

export function Badge({ className, variant = "default", dot = false, children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    brand: "bg-blue-50 text-blue-700 border-blue-200/80",
    terracotta: "bg-blue-50 text-blue-700 border-blue-200/80",
    open: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    closed: "bg-slate-100 text-slate-600 border-slate-200",
    archived: "bg-amber-50 text-amber-700 border-amber-200/80",
    private: "bg-slate-100 text-slate-600 border-slate-200",
    shared: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    warning: "bg-amber-50 text-amber-700 border-amber-200/80",
    danger: "bg-rose-50 text-rose-700 border-rose-200/80",
  };

  const dotColors = {
    default: "bg-slate-400",
    brand: "bg-blue-500",
    terracotta: "bg-blue-500",
    open: "bg-emerald-500",
    closed: "bg-slate-400",
    archived: "bg-amber-500",
    private: "bg-slate-400",
    shared: "bg-indigo-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-tight",
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}
