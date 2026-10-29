import { getServerSession, getAct } from "@/lib/api";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Scale,
  Shield,
  Briefcase,
  BookOpen,
  LogOut,
  ArrowLeft,
} from "lucide-react";

export default async function ActPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const act = await getAct(id);
  if (!act) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card variant="elevated" padding="lg" className="w-full max-w-md text-center border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Act Not Found</h2>
          <p className="text-xs text-slate-500 mb-6">The requested legislation record does not exist or has been deleted.</p>
          <Link href="/admin" className="block">
            <Button variant="default" className="w-full">
              Return to Legislation Library
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const sections = act.sections || [];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar Navigation */}
      <aside className="hidden lg:flex lg:w-64 flex-col border-r border-slate-200 bg-white select-none">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Scale className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base tracking-tight leading-none">Soli</span>
              <span className="block text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-0.5">
                Admin Console
              </span>
            </div>
          </div>
          <Badge variant="warning" className="text-[10px] py-0 px-2">Partner</Badge>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 rounded-lg bg-slate-900 text-white px-3 py-2 text-xs font-medium shadow-xs"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Central Legislation</span>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 text-xs font-medium transition-colors"
          >
            <Briefcase className="w-4 h-4 text-slate-400" />
            <span>Matters & Briefs</span>
          </Link>
        </nav>

        <div className="p-3 border-t border-slate-100">
          <a
            href="/api/auth/logout"
            className="flex items-center gap-2.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-2 text-xs font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white/85 backdrop-blur-md px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Back to Acts"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-slate-900 tracking-tight">
                {act.name}{act.year ? `, ${act.year}` : ""}
              </h1>
              <p className="text-xs text-slate-500">
                Version {act.version || "1.0"} · {sections.length} parsed statutory sections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Badge variant={act.is_published ? "open" : "default"} dot>
              {act.is_published ? "Published Firm-wide" : "Draft Status"}
            </Badge>

            <form action={`/api/acts/${id}/publish`} method="POST" className="inline">
              <input type="hidden" name="isPublished" value={String(!act.is_published)} />
              <Button
                type="submit"
                size="sm"
                variant={act.is_published ? "outline" : "default"}
                className="text-xs h-8"
              >
                {act.is_published ? "Unpublish" : "Publish to Firm"}
              </Button>
            </form>
          </div>
        </header>

        <main className="p-6 lg:p-8 flex-1 max-w-5xl w-full mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Sections & Statutory Text
            </h2>
            <span className="text-xs text-slate-400">{sections.length} total sections</span>
          </div>

          <div className="space-y-3">
            {sections.length === 0 ? (
              <Card variant="default" padding="lg" className="text-center py-12 border-dashed">
                <p className="text-xs text-slate-500">No sections parsed yet from the uploaded PDF document.</p>
              </Card>
            ) : (
              sections.map((s: any) => (
                <Card
                  key={s.id}
                  variant="default"
                  padding="none"
                  className="p-4 border-slate-200 bg-white hover:border-slate-300 transition-all shadow-subtle"
                >
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 flex items-center justify-center h-6 w-9 rounded-md bg-blue-50 text-blue-700 font-mono text-xs font-bold border border-blue-200">
                      §{s.number}
                    </span>
                    <div className="flex-1 min-w-0">
                      {s.title && (
                        <h4 className="text-xs font-semibold text-slate-900 mb-1">
                          {s.title}
                        </h4>
                      )}
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                        {s.content}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
