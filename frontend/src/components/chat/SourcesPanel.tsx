"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, X, ExternalLink, Bookmark, Search, Copy, Check } from "lucide-react";

export interface SourceItem {
  index: number;
  sourceType: string;
  sourceName: string;
  page?: number | null;
  section?: string | null;
  excerpt: string;
  scope: string;
  content?: string;
  actName?: string;
  actYear?: number | null;
}

export interface SourcesPanelProps {
  sources: SourceItem[];
  onSelect: (s: SourceItem | null) => void;
  activeSource: SourceItem | null;
  onClose?: () => void;
}

export function SourcesPanel({ sources, onSelect, activeSource, onClose }: SourcesPanelProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTS" | "CASES">("ALL");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      if (filter === "ACTS" && s.sourceType !== "LEGISLATION") return false;
      if (filter === "CASES" && s.sourceType === "LEGISLATION") return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (s.sourceName || "").toLowerCase().includes(q) ||
        (s.section || "").toLowerCase().includes(q) ||
        (s.excerpt || "").toLowerCase().includes(q)
      );
    });
  }, [sources, search, filter]);

  const copyExcerpt = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex h-full flex-col bg-white font-sans select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-bold text-xs text-slate-900 tracking-tight">
            Authorities & Citations
          </h3>
          <span className="text-[11px] text-slate-400 font-semibold">({sources.length})</span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      {sources.length > 0 && (
        <div className="p-3 border-b border-slate-100 space-y-2 bg-slate-50/40 shrink-0">
          <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/80">
            <button
              onClick={() => setFilter("ALL")}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                filter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({sources.length})
            </button>
            <button
              onClick={() => setFilter("ACTS")}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                filter === "ACTS" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Statutes
            </button>
            <button
              onClick={() => setFilter("CASES")}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                filter === "CASES" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Case Files
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Filter authorities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pl-7 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 shadow-subtle"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Source Detail Preview */}
      {activeSource && (
        <div className="p-4 border-b border-blue-100 bg-blue-50/40 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-[11px] text-blue-700 uppercase tracking-wider flex items-center gap-1">
              <Bookmark className="w-3 h-3" />
              Authority [{activeSource.index}] Focused
            </span>
            <Badge
              variant={activeSource.scope === "SHARED" ? "warning" : "default"}
              dot
            >
              {activeSource.scope === "SHARED" ? "Central Act" : "Case Record"}
            </Badge>
          </div>

          <h4 className="font-bold text-xs text-slate-900 mb-1 leading-snug">
            {activeSource.sourceName}
          </h4>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-2.5">
            {activeSource.section && (
              <span className="font-mono font-bold text-blue-700">
                Section {activeSource.section}
              </span>
            )}
            {activeSource.page && (
              <span className="font-mono">Page {activeSource.page}</span>
            )}
          </div>

          <div className="p-3 rounded-xl border border-blue-200/70 bg-white text-xs text-slate-800 leading-relaxed max-h-48 overflow-y-auto shadow-subtle select-text">
            {activeSource.excerpt || activeSource.content}
          </div>

          <div className="mt-2.5 flex items-center justify-between">
            <button
              onClick={() => onSelect(null)}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer inline-flex items-center gap-1"
            >
              Clear focus ✕
            </button>
            <button
              onClick={() => copyExcerpt(activeSource.excerpt || activeSource.content || "", activeSource.index)}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer inline-flex items-center gap-1"
            >
              {copiedIndex === activeSource.index ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Statutory Excerpt</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Sources List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-custom">
        {filteredSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-900 mb-1">
              {sources.length === 0 ? "No Authorities Retrieved Yet" : "No matching authorities"}
            </p>
            <p className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed">
              {sources.length === 0
                ? "Ask a question in chat to ground legal answers against statutes and uploaded case files."
                : "Try adjusting your filter or search keywords."}
            </p>
          </div>
        ) : (
          filteredSources.map((s, idx) => {
            const isSelected = activeSource?.index === s.index;
            const isLegislation = s.sourceType === "LEGISLATION";
            const pin = isLegislation && s.section ? `§${s.section}` : s.page ? `p. ${s.page}` : null;

            return (
              <div
                key={idx}
                onClick={() => onSelect(s)}
                className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-subtle"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <span
                      className={`flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold shrink-0 ${
                        isSelected ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {s.index}
                    </span>
                    <span className="text-[11px] font-semibold truncate" title={s.sourceName}>
                      {s.sourceName}
                    </span>
                  </div>

                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      isSelected
                        ? "bg-slate-800 text-slate-300"
                        : s.scope === "SHARED"
                        ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {s.scope === "SHARED" ? "Act" : "Case"}
                  </span>
                </div>

                {pin && (
                  <div
                    className={`text-[10px] font-mono font-bold mb-1.5 ${
                      isSelected ? "text-blue-300" : "text-blue-600"
                    }`}
                  >
                    {pin}
                  </div>
                )}

                <p
                  className={`text-xs line-clamp-2 leading-relaxed ${
                    isSelected ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {s.excerpt || s.content}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
