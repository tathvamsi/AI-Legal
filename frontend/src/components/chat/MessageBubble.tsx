"use client";

import { useState } from "react";
import { CitationChip } from "./CitationChip";
import { MarkdownContent } from "./MarkdownContent";
import { formatTime } from "@/lib/utils";
import { Scale, Copy, Check, Sparkles } from "lucide-react";

export interface MessageBubbleProps {
  message: {
    id: string;
    role: "USER" | "ASSISTANT" | "SYSTEM";
    content: string;
    createdAt?: string;
    created_at?: string;
    citations?: any[];
    streaming?: boolean;
  };
  onCiteSelect: (citation: any) => void;
  activeCitationIndex: number | null;
}

export function MessageBubble({ message, onCiteSelect, activeCitationIndex }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "USER";
  const isAssistant = message.role === "ASSISTANT";
  const streaming = message.streaming || false;

  const rawTime = message.createdAt || message.created_at;
  const time = rawTime ? formatTime(rawTime) : "";

  function copyText() {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1 mb-6 max-w-2xl ml-auto">
        <div className="rounded-2xl rounded-tr-xs bg-slate-900 text-white px-5 py-3.5 shadow-sm text-sm leading-relaxed font-normal">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {time && (
          <span className="text-[11px] text-slate-400 px-1 font-medium">
            {time}
          </span>
        )}
      </div>
    );
  }

  // Assistant / Soli response
  return (
    <div className="flex flex-col gap-2.5 mb-8 max-w-3xl mr-auto w-full group">
      {/* Soli Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <Scale className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <span className="font-semibold text-xs text-slate-900 tracking-tight flex items-center gap-1.5">
            Soli Paralegal
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          </span>
          {time && (
            <span className="text-[11px] text-slate-400 font-medium">
              • {time}
            </span>
          )}
          {streaming && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              <Sparkles className="w-3 h-3 animate-pulse" />
              Synthesizing legal authorities…
            </span>
          )}
        </div>

        {/* Copy action */}
        {isAssistant && !streaming && message.content && (
          <button
            onClick={copyText}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 text-xs flex items-center gap-1"
            title="Copy response"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 text-[11px] font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="pl-8.5 pr-2">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle">
          <MarkdownContent
            content={message.content}
            citations={message.citations || []}
            onCiteSelect={onCiteSelect}
            activeCitationIndex={activeCitationIndex}
          />

          {streaming && (
            <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1 align-text-bottom rounded-xs" />
          )}

          {/* Citations Footer */}
          {isAssistant && message.citations && message.citations.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider mb-2.5 flex items-center gap-1.5">
                <span>Verified Legal Authorities</span>
                <span className="text-blue-600 font-bold">({message.citations.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {message.citations.map((c: any, i) => (
                  <CitationChip
                    key={c.id || i}
                    index={c.index ?? i + 1}
                    sourceName={c.sourceName || "Source"}
                    page={c.page ?? null}
                    section={c.section ?? null}
                    scope={c.scope || "PRIVATE"}
                    sourceType={c.sourceType || "CASE_FILE"}
                    onSelect={() => onCiteSelect(c)}
                    active={activeCitationIndex === (c.index ?? i + 1)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
