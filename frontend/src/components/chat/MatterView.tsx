"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";
import { DocumentList } from "./DocumentList";
import { ChatPane } from "./ChatPane";
import { SourcesPanel } from "./SourcesPanel";
import {
  Scale,
  ArrowLeft,
  Plus,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Search,
  BookOpen,
  Menu,
  X,
  Briefcase,
} from "lucide-react";

interface MatterViewProps {
  initialMatter: any;
  session: any;
}

export default function MatterView({ initialMatter, session }: MatterViewProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [activeSource, setActiveSource] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [conversationSearch, setConversationSearch] = useState("");

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations?matterId=${initialMatter.id}`);
      if (res.ok) {
        const data = await res.json();
        const list = data.conversations || [];
        setConversations(list);
        if (list.length > 0 && !activeConversationId) {
          setActiveConversationId(list[0].id);
        }
      }
    } catch {}
  }, [initialMatter.id, activeConversationId]);

  const fetchMessages = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        const allCitations: any[] = [];
        (data.messages || []).forEach((m: any) => {
          if (m.citations && m.citations.length > 0) {
            m.citations.forEach((c: any) => {
              if (
                !allCitations.some(
                  (existing) =>
                    existing.id === c.id ||
                    (existing.sourceName === c.sourceName &&
                      existing.page === c.page &&
                      existing.section === c.section)
                )
              ) {
                allCitations.push({ index: allCitations.length + 1, ...c });
              }
            });
          }
        });
        setSources(allCitations);
        setActiveSource(null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchConversations();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchConversations]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId, fetchMessages]);

  async function createConversation() {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matterId: initialMatter.id, title: "New consultation" }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const id = data.conversation.id;
      setConversations((prev) => [
        { id, title: "New consultation", matter_id: initialMatter.id, created_at: new Date().toISOString() },
        ...prev,
      ]);
      setActiveConversationId(id);
      setMessages([]);
      setSources([]);
      setActiveSource(null);
      setMobileDrawerOpen(false);
    } catch {}
  }

  function handleSelectSource(source: any | null) {
    setActiveSource(source);
    if (source && !sourcesOpen) {
      setSourcesOpen(true);
    }
  }

  const filteredConversations = useMemo(() => {
    if (!conversationSearch.trim()) return conversations;
    const q = conversationSearch.toLowerCase().trim();
    return conversations.filter((c) => (c.title || "").toLowerCase().includes(q));
  }, [conversations, conversationSearch]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Opening privileged workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden select-none font-sans">
      {/* Mobile drawer backdrop */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 transition-all duration-200 ease-in-out lg:static lg:z-auto ${
          sidebarCollapsed ? "lg:w-16" : "lg:w-80 w-80"
        } ${mobileDrawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Header & Soli Identity */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/dashboard"
              className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs shrink-0 hover:bg-slate-800 transition-colors"
              title="Return to Matters Dashboard"
            >
              <Scale className="h-4 w-4 text-blue-400" />
            </Link>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm tracking-tight">Soli</span>
                  <Badge variant="brand" className="text-[9px] py-0 px-1.5">Desk</Badge>
                </div>
                <Link
                  href="/dashboard"
                  className="text-[11px] text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1 mt-0.5 truncate"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>All Matters</span>
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Collapsed sidebar view */}
        {sidebarCollapsed ? (
          <div className="p-2 space-y-4 flex flex-col items-center">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Expand Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={createConversation}
              className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              title="New Consultation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col p-4 space-y-5 scrollbar-custom">
            {/* Matter Selector / Info Card */}
            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-1.5 shrink-0 shadow-subtle">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Active Matter
                </span>
                <Badge
                  variant={initialMatter.status === "OPEN" ? "open" : "default"}
                  dot
                >
                  {initialMatter.status || "OPEN"}
                </Badge>
              </div>
              <h3 className="font-semibold text-xs text-slate-900 leading-snug line-clamp-2">
                {initialMatter.name}
              </h3>
              <p className="text-[11px] text-slate-400 truncate font-mono">
                {initialMatter.case_number || initialMatter.caseNumber || "No case number"}
              </p>
            </div>

            {/* Conversations Section */}
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Consultations
                </span>
                <button
                  onClick={createConversation}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              </div>

              {conversations.length > 2 && (
                <div className="relative">
                  <input
                    type="text"
                    value={conversationSearch}
                    onChange={(e) => setConversationSearch(e.target.value)}
                    placeholder="Search consultations…"
                    className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pl-7 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 shadow-subtle"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {conversationSearch && (
                    <button
                      onClick={() => setConversationSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-1 overflow-y-auto flex-1 max-h-56 pr-0.5 scrollbar-custom">
                {filteredConversations.map((c) => {
                  const isActive = activeConversationId === c.id;
                  const dateStr = formatRelative(c.created_at || c.createdAt);
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveConversationId(c.id);
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex flex-col gap-0.5 ${
                        isActive
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className={`w-3 h-3 shrink-0 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                        <span className="text-xs font-medium truncate leading-tight">
                          {c.title || "Untitled consultation"}
                        </span>
                      </div>
                      <span className={`text-[10px] pl-4.5 ${isActive ? "text-slate-400" : "text-slate-400"}`}>
                        {dateStr}
                      </span>
                    </button>
                  );
                })}
                {filteredConversations.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No conversations found.</p>
                )}
              </div>
            </div>

            {/* Document Files Section */}
            <div className="pt-3 border-t border-slate-100 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Case Pleadings & Evidence
                </span>
              </div>
              <DocumentList matterId={initialMatter.id} onDocumentReady={fetchConversations} />
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Navbar */}
        <header className="h-13 border-b border-slate-200 bg-white/85 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
              title="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-slate-900 text-sm truncate">
                {initialMatter.name}
              </span>
              <span className="text-slate-300 text-xs hidden sm:inline">•</span>
              <span className="text-xs text-slate-500 truncate hidden sm:inline">
                {initialMatter.court || "High Court of Delhi"}
              </span>
              <span className="text-slate-300 text-xs hidden md:inline">•</span>
              <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Nemotron 120B AI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <span className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                {session?.name ? session.name.charAt(0).toUpperCase() : "C"}
              </span>
              <span className="font-semibold text-slate-800">{session?.name || session?.email}</span>
            </div>

            {/* Toggle Sources Panel Button */}
            <button
              onClick={() => setSourcesOpen(!sourcesOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                sourcesOpen
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              }`}
              title={sourcesOpen ? "Hide Authorities Panel" : "Show Authorities Panel"}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Authorities</span>
              {sources.length > 0 && (
                <span
                  className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    sourcesOpen ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {sources.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Chat + Sources Split */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 h-full">
            <ChatPane
              matterId={initialMatter.id}
              conversationId={activeConversationId}
              messages={messages}
              setMessages={setMessages}
              setSources={setSources}
              setActiveSource={handleSelectSource}
              onNewConversation={createConversation}
              activeCitationIndex={activeSource?.index ?? null}
              onToggleSources={() => setSourcesOpen(!sourcesOpen)}
              sourcesCount={sources.length}
              sourcesOpen={sourcesOpen}
            />
          </div>

          {/* Right Sources Drawer */}
          {sourcesOpen && (
            <aside className="w-80 lg:w-96 border-l border-slate-200 bg-white flex flex-col h-full shrink-0 shadow-subtle transition-all">
              <SourcesPanel
                sources={sources}
                onSelect={setActiveSource}
                activeSource={activeSource}
                onClose={() => setSourcesOpen(false)}
              />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
