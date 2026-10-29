"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

export function Separator({
  className,
  orientation = "horizontal",
  decorative = false,
  ...props
}: SeparatorProps) {
  return (
    <hr
      className={cn(
        "relative flex w-full shrink-0 bg-border-soft dark:bg-border-muted",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      aria-orientation={orientation}
      {...(decorative ? { "aria-hidden": true } : {})}
      {...props}
    />
  );
}
