"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, className, children }: DialogProps) {
  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-center justify-center", className)}
    >
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="relative z-10 w-full max-w-lg mx-4 transform transition-all"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? "scale(1)" : "scale(0.95)",
        }}
      >
        {open && <div className="fixed inset-0 z-0"></div>}
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}
export function DialogContent({ className, children, ...props }: DialogContentProps) {
  return (
    <div
      className={cn(
        "relative w-full rounded-2xl border border-cream-300 bg-white shadow-medium animate-slide-up",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <h3 className={cn("font-serif text-lg font-semibold text-navy-900 tracking-tight", className)} {...props} />
  );
}

export interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return <p className={cn("text-sm text-mute leading-relaxed", className)} {...props} />;
}

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 border-t border-cream-200", className)} {...props} />;
}
