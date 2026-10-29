"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import CreateMatterForm from "./create-matter-form";
import {
  Scale,
  Briefcase,
  FileText,
  Clock,
  Building,
  Shield,
  LogOut,
  FolderOpen,
  ArrowRight,
  Search,
  Sparkles,
  Layers,
  ChevronRight,
  Filter,
  CheckCircle2,
} from "lucide-react";

interface DashboardClientProps {
  session: {
    userId: string;
    email: string;
    name?: string | null;
    role: string;
    firmId?: string;
  };
  matters: any[];
}

export default function DashboardClient({ session, matters: initialMatters }: DashboardClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredMatters = useMemo(() => {
    return initialMatters.filter((m) => {
      const matchStatus = statusFilter === "ALL" || (m.status || "OPEN") === statusFilter;
      if (!matchStatus) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (m.name || "").toLowerCase().includes(q) ||
        (m.client || "").toLowerCase().includes(q) ||
        (m.court || "").toLowerCase().includes(q) ||
        (m.caseNumber || m.case_number || "").toLowerCase().includes(q)
      );
    });
  }, [initialMatters, search, statusFilter]);

  const openCount = initialMatters.filter((m) => (m.status || "OPEN") === "OPEN").length;
  const closedCount = initialMatters.filter((m) => m.status === "CLOSED").length;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 select-none">
      {/* Sidebar Navigation */}
      <aside className="hidden lg:flex lg:w-64 flex-col border-r border-slate-200 bg-white">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md ring-1 ring-slate-800">
              <Scale className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base tracking-tight leading-none">Soli</span>
              <span className="block text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
                Litigation AI
              </span>
            </div>
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            v2.0
          </span>
        </div>

        {/* Lawyer Profile Quick View */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-200">
              {session.name ? session.name.charAt(0).toUpperCase() : "C"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate">{session.name || "Advocate"}</p>
              <p className="text-[11px] text-slate-400 truncate font-mono">{session.email}</p>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          <Link
            href="/dashboard"
            className="flex items-center justify-between rounded-xl bg-slate-900 text-white px-3 py-2.5 text-xs font-medium shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <Briefcase className="w-4 h-4 text-blue-400" />
              <span>Matters & Briefs</span>
            </div>
            <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {initialMatters.length}
            </span>
          </Link>

          {session.role === "ADMIN" && (
            <Link
              href="/admin"
              className="flex items-center gap-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2.5 text-xs font-medium transition-colors"
            >
              <Shield className="w-4 h-4 text-slate-400" />
              <span>Central Acts & Admin</span>
            </Link>
          )}
        </nav>

        {/* Engine status pill */}
        <div className="p-3 m-3 rounded-xl bg-slate-900 text-white space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Active Engine
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <p className="text-xs font-semibold text-white tracking-tight">Nemotron 3.5 120B</p>
          <p className="text-[10px] text-slate-400">Indian Statutory Intelligence</p>
        </div>

        <div className="p-3 border-t border-slate-100">
          <a
            href="/api/auth/logout"
            className="flex items-center gap-2.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-2 text-xs font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white/85 backdrop-blur-md px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="lg:hidden flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <Scale className="h-4 w-4 text-blue-400" />
              </div>
              <span className="font-bold text-slate-900">Soli</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">Litigation Command Center</h1>
              <p className="text-xs text-slate-500">Privileged case files, petitions, and statutory research</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CreateMatterForm />
          </div>
        </header>

        {/* Content Body */}
        <main className="p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto space-y-6">
          {/* Executive Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-subtle flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Active Matters</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">{openCount}</h3>
                <span className="text-[11px] text-slate-500 font-medium">Ready for AI counsel</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-subtle flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Total Briefs</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">{initialMatters.length}</h3>
                <span className="text-[11px] text-slate-500 font-medium">Across all forums</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                <FolderOpen className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-subtle flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Central Acts</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">84+</h3>
                <span className="text-[11px] text-slate-500 font-medium">CPC, NI Act, CrPC/BNSS</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Scale className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-subtle flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Intelligence</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Live NIM</h3>
                </div>
                <span className="text-[11px] text-emerald-700 font-medium">316ms TTFB Streaming</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Input
                type="text"
                placeholder="Search by case title, client, court, or docket..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="pl-9 text-xs bg-white border-slate-200 h-10 rounded-xl"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === "ALL"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                All ({initialMatters.length})
              </button>
              <button
                onClick={() => setStatusFilter("OPEN")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === "OPEN"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Open ({openCount})
              </button>
              <button
                onClick={() => setStatusFilter("CLOSED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === "CLOSED"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Closed ({closedCount})
              </button>
            </div>
          </div>

          {/* Matters Grid */}
          {filteredMatters.length === 0 ? (
            <Card variant="default" padding="lg" className="border-dashed border-2 border-slate-200 bg-white text-center py-16 rounded-2xl">
              <CardContent className="p-0 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100">
                  <FolderOpen className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  {search ? "No matching matters found" : "No Matters Created Yet"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mb-6">
                  {search
                    ? `No matters match "${search}". Try clearing search or changing filters.`
                    : "Initiate your first litigation workspace to upload petitions, contracts, and begin AI-assisted research with statutory citations."}
                </p>
                {search ? (
                  <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                    Clear search
                  </Button>
                ) : (
                  <CreateMatterForm />
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMatters.map((m: any) => (
                <Link
                  key={m.id}
                  href={`/matters/${m.id}`}
                  className="group block focus:outline-none"
                >
                  <Card
                    variant="default"
                    padding="none"
                    className="h-full border-slate-200/90 bg-white p-5 rounded-2xl hover:border-slate-300 hover:shadow-soft transition-all duration-200 flex flex-col justify-between group-hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Badge
                          variant={m.status === "OPEN" ? "open" : m.status === "CLOSED" ? "closed" : "archived"}
                          dot
                        >
                          {m.status || "OPEN"}
                        </Badge>
                        <span className="text-[11px] text-slate-400 font-mono font-medium">
                          {m.caseNumber || m.case_number || "Civil Suit"}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug mb-2">
                        {m.name}
                      </h3>

                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        {m.court && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Scale className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{m.court}</span>
                          </div>
                        )}
                        {m.client && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">Client: {m.client}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDate(m.created_at || m.createdAt)}
                      </span>
                      <span className="font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        Open Desk <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}