"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circle" | "rect" | "line";
  className?: string;
}

export function Skeleton({ className, variant = "text", ...props }: SkeletonProps) {
  const variants = {
    text: "h-4 w-full rounded animate-shimmer",
    circle: "h-8 w-8 rounded-full animate-shimmer",
    rect: "h-32 w-full rounded-lg animate-shimmer",
    line: "h-1 w-3/4 rounded animate-shimmer",
  };
  return (
    <div className={cn(variants[variant], className)} {...props} />
  );
}
