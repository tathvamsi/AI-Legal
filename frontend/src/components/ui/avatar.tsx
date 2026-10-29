"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "default" | "bordered";
}

export function Avatar({
  className,
  size = "md",
  variant = "default",
  children,
  ...props
}: AvatarProps) {
  const sizes = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };
  const variantStyles = {
    default: "bg-cream-200 text-navy-900",
    bordered: "bg-white border border-cream-300 text-navy-900",
  };
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-navy-900",
        sizes[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {}
export function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return (
    <span
      className={cn("flex items-center justify-center", className)}
      {...props}
    />
  );
}
