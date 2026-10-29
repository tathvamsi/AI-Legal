"use client";

import { FileText, BookOpen } from "lucide-react";

export interface CitationChipProps {
  index: number;
  sourceName: string;
  page?: number | null;
  section?: string | null;
  scope: string;
  sourceType: string;
  onSelect: () => void;
  active: boolean;
}

export function CitationChip({
  index,
  sourceName,
  page,
  section,
  scope,
  sourceType,
  onSelect,
  active,
}: CitationChipProps) {
  const isLegislation = sourceType === "LEGISLATION";
  const pin = isLegislation && section ? `§${section}` : page ? `p. ${page}` : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all duration-150 cursor-pointer text-left shadow-subtle ${
        active
          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
          : "bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40"
      }`}
    >
      <span
        className={`flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold ${
          active ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-700 border border-blue-200"
        }`}
      >
        {index}
      </span>

      <span className="flex items-center gap-1.5">
        {isLegislation ? (
          <BookOpen className={`w-3 h-3 ${active ? "text-amber-300" : "text-amber-600"}`} />
        ) : (
          <FileText className={`w-3 h-3 ${active ? "text-blue-300" : "text-blue-600"}`} />
        )}
        <span className="font-medium truncate max-w-[180px]" title={sourceName}>
          {sourceName}
        </span>
      </span>

      {pin && (
        <span
          className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-medium ${
            active ? "bg-slate-800 text-blue-200" : "bg-slate-100 text-slate-600"
          }`}
        >
          {pin}
        </span>
      )}

      <span
        className={`text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
          active
            ? "bg-slate-800 text-slate-300"
            : scope === "SHARED"
            ? "bg-amber-50 text-amber-700 border border-amber-200/60"
            : "bg-slate-100 text-slate-600 border border-slate-200"
        }`}
      >
        {scope === "SHARED" ? "Central Act" : "Case File"}
      </span>
    </button>
  );
}
