"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      {icon && (
        <div className="mb-6 p-3 rounded-xl bg-cream-100 text-terracotta">
          {icon}
        </div>
      )}
      <h3 className="font-serif text-lg font-semibold text-navy-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-mute max-w-xs mb-6">{description}</p>
      )}
      {action && (
        <div className="w-full max-w-xs">{action}</div>
      )}
    </div>
  );
}


