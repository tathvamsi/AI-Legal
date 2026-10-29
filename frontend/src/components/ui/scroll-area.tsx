"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  type?: "always" | "hover" | "auto";
}

export function ScrollArea({
  children,
  className,
  type = "auto",
  ...props
}: ScrollAreaProps) {
  const scrollbarStyles = {
    always: "opacity-100",
    hover: "group-hover:opacity-100 opacity-0 transition-opacity",
    auto: "opacity-0 group-hover:opacity-100 transition-opacity",
  };
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <div className="relative overflow-y-scroll scrollbar-hide pr-2 group">
        <div className="flex h-full flex-col pb-4">
          {children}
        </div>
        <Scrollbar type={type} variant={scrollbarStyles[type]} />
      </div>
    </div>
  );
}

interface ScrollbarProps {
  type: string;
  variant: string;
}

function Scrollbar({ type, variant }: ScrollbarProps) {
  return (
    <div
      className={cn(
        "absolute right-0 top-0 bottom-0 w-1.5 rounded-full",
        variant,
        type === "always" ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      )}
    >
      <div className="flex-1 bg-cream-300 rounded-full mx-1 my-1" />
    </div>
  );
}
