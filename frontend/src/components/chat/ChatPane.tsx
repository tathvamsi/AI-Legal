"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./MessageBubble";
import {
  Scale,
  Sparkles,
  ArrowUp,
  Square,
  Shield,
  BookOpen,
  FileText,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

export interface ChatPaneProps {
  matterId: string;
  conversationId: string | null;
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setSources: (s: any[]) => void;
  setActiveSource: (s: any | null) => void;
  onNewConversation: (id: string | null, title: string) => void;
  activeCitationIndex?: number | null;
  onToggleSources?: () => void;
  sourcesCount?: number;
  sourcesOpen?: boolean;
}

const QUICK_CHIPS = [
  { label: "📜 Draft Legal Notice", prompt: "Draft a formal legal notice for breach of contract and demand for compensation under the Indian Contract Act." },
  { label: "⚖️ Order 39 CPC Injunction", prompt: "Evaluate the 3-pillar test for ad-interim ex-parte injunction under Order 39 Rules 1 & 2 CPC." },
  { label: "💼 Section 138 NI Checklist", prompt: "Provide a statutory compliance checklist and procedural steps for filing a complaint under Section 138 Negotiable Instruments Act." },
  { label: "⏳ Limitation Period Analysis", prompt: "Analyze the applicable limitation period under the Limitation Act 1963 for this claim." },
  { label: "🔍 Cross-Examination Points", prompt: "Draft 8 critical cross-examination questions challenging the petitioner's evidentiary averments." },
];

const SUGGESTIONS = [
  {
    category: "Evidentiary Review",
    title: "Relief & Damages Claimed",
    desc: "What monetary damages or specific reliefs does the petitioner seek in this matter?",
  },
  {
    category: "Statutory Analysis",
    title: "Section 73 Indian Contract Act",
    desc: "Analyze the breach and measure of compensation under Section 73 of the Indian Contract Act, 1872",
  },
  {
    category: "Litigation Strategy",
    title: "Maintainability Objections",
    desc: "Identify potential preliminary objections and maintainability defences under CPC for the respondent",
  },
  {
    category: "Formal Drafting",
    title: "Interim Injunction Application",
    desc: "Draft a formal application under Order XXXIX Rules 1 & 2 read with Section 151 CPC for urgent interim relief",
  },
];

export function ChatPane({
  matterId,
  conversationId,
  messages,
  setMessages,
  setSources,
  setActiveSource,
  onNewConversation,
  activeCitationIndex,
  onToggleSources,
  sourcesCount = 0,
  sourcesOpen = false,
}: ChatPaneProps) {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUserScrolledUp = useRef(false);

  const scrollToBottom = useCallback((smooth = true) => {
    if (isUserScrolledUp.current) return;
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserScrolledUp.current = distanceFromBottom > 120;
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, streaming, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = input.trim();
      if (text && !streaming) {
        submitChat(text);
      }
    }
  };

  function stopStream() {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setStreaming(false);
  }

  async function handleRetry() {
    setError(null);
    if (input.trim()) {
      await submitChat(input.trim());
    }
  }

  async function submitChat(text: string) {
    if (!text || streaming) return;
    setError(null);
    setStreaming(true);
    isUserScrolledUp.current = false;

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    abortRef.current = new AbortController();

    const userOptimisticId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const assistantOptimisticId = `asst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    setMessages((prev) => [
      ...prev,
      {
        id: userOptimisticId,
        role: "USER",
        content: text,
        createdAt: new Date().toISOString(),
      },
      {
        id: assistantOptimisticId,
        role: "ASSISTANT",
        content: "",
        createdAt: new Date().toISOString(),
        citations: [],
        streaming: true,
      },
    ]);
    setInput("");

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, matterId, message: text }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server returned ${res.status}`);
      }

      reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedAssistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;

          try {
            const evt = JSON.parse(payload);
            if (evt.type === "token") {
              accumulatedAssistantText += evt.delta;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantOptimisticId
                    ? { ...m, content: accumulatedAssistantText, streaming: true }
                    : m
                )
              );
            } else if (evt.type === "done") {
              const citations = evt.citations || [];
              setSources(citations);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantOptimisticId
                    ? {
                        ...m,
                        content: accumulatedAssistantText,
                        citations,
                        streaming: false,
                      }
                    : m
                )
              );
            } else if (evt.type === "error") {
              throw new Error(evt.error || "Generation error");
            }
          } catch {
            // ignore non-json SSE lines
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError" || err?.message?.includes("closed")) {
        setStreaming(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantOptimisticId ? { ...m, streaming: false } : m
          )
        );
        return;
      }

      setError({
        message: err.message || "Failed to communicate with Soli assistant.",
        retryable: true,
      });

      setMessages((prev) =>
        prev
          .map((m) =>
            m.id === assistantOptimisticId ? { ...m, streaming: false } : m
          )
          .filter((m) => !(m.id === assistantOptimisticId && !m.content.trim()))
      );
    } finally {
      if (reader) {
        try {
          reader.releaseLock();
        } catch {}
      }
      setStreaming(false);
    }
  }

  function handleCiteSelect(citation: any) {
    setActiveSource(citation);
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full flex-col bg-slate-50/50 relative min-w-0 font-sans">
      {/* Top action strip */}
      <div className="h-11 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
          <span className="text-xs font-semibold text-slate-800">
            Privileged Consultation
          </span>
          <span className="text-xs text-slate-300">•</span>
          <span className="text-xs text-slate-500">
            End-to-End Encrypted Vault
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Sparkles className="w-2.5 h-2.5 text-blue-500" />
            NVIDIA Nemotron 120B NIM
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasMessages && (
            <button
              onClick={() => onNewConversation(null, "New Consultation")}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
              title="Start fresh conversation"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Chat</span>
            </button>
          )}

          {onToggleSources && (
            <button
              onClick={onToggleSources}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                sourcesOpen
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              <span>Authorities & Citations</span>
              {sourcesCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    sourcesOpen ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {sourcesCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-6 lg:px-12 lg:py-8 space-y-2 scrollbar-custom"
      >
        {!hasMessages && !error && (
          <div className="max-w-2xl mx-auto py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-4 shadow-md ring-1 ring-slate-800">
              <Scale className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1.5 tracking-tight">
              Soli Litigation Research Desk
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto mb-8">
              Ask statutory legal questions, verify precedents, extract evidence from case records, or draft court applications.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => submitChat(s.desc)}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-soft transition-all text-left group cursor-pointer shadow-subtle flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 block mb-1">
                      {s.category}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1.5">
                      {s.title}
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {s.desc}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-600 mt-3 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Execute research →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="max-w-3xl mx-auto mb-6 p-4 rounded-xl border border-rose-200 bg-rose-50 flex items-start justify-between gap-3 shadow-subtle">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-rose-800">Research Error</h4>
                <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">{error.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {error.retryable && (
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs bg-white text-rose-700 border-rose-200 hover:bg-rose-100"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
              <button
                onClick={() => setError(null)}
                className="text-rose-400 hover:text-rose-700 text-xs px-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Message stream */}
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            onCiteSelect={handleCiteSelect}
            activeCitationIndex={activeCitationIndex ?? null}
          />
        ))}
      </div>

      {/* Fixed-Bottom Composer */}
      <div className="border-t border-slate-200 bg-white p-4 lg:px-12 lg:py-4 shadow-subtle shrink-0">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* Quick Legal Prompt Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
            {QUICK_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInput(chip.prompt);
                  if (textareaRef.current) textareaRef.current.focus();
                }}
                className="shrink-0 text-[11px] font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/90 rounded-full px-3 py-1 transition-colors cursor-pointer select-none"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const text = input.trim();
              if (text && !streaming) submitChat(text);
            }}
            className="relative flex flex-col rounded-2xl border border-slate-200 bg-white shadow-subtle focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={streaming}
              placeholder="Ask Soli about this matter, affidavits, or legislation (Return to send, Shift+Return for new line)…"
              className="w-full resize-none bg-transparent px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none min-h-[44px] max-h-[180px] leading-relaxed"
            />

            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-slate-400" />
                Indian Law statutory grounding & record citations
              </span>

              <div className="flex items-center gap-2">
                {streaming ? (
                  <Button
                    type="button"
                    onClick={stopStream}
                    variant="danger"
                    size="sm"
                    className="h-8 px-3 text-xs"
                  >
                    <Square className="w-3 h-3 mr-1 fill-current" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    disabled={!input.trim()}
                    className="h-8 px-3.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    <span>Send</span>
                    <ArrowUp className="w-3.5 h-3.5 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </form>

          <p className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
            Privileged legal intelligence. Verified against Indian statutory records & filed documents.
          </p>
        </div>
      </div>
    </div>
  );
}
