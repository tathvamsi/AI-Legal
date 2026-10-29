import { getServerSession, getActs } from "@/lib/api";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import {
  Scale,
  Shield,
  Briefcase,
  BookOpen,
  LogOut,
  Upload,
  Plus,
} from "lucide-react";

export default async function AdminPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const acts = await getActs();

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
          <div>
            <h1 className="text-base font-semibold text-slate-900 tracking-tight">Statutory Library</h1>
            <p className="text-xs text-slate-500">Centrally administered Indian Acts and Codes available to all matters</p>
          </div>
        </header>

        <main className="p-6 lg:p-8 flex-1 max-w-5xl w-full mx-auto space-y-8">
          {/* Ingest Act Card */}
          <Card variant="elevated" padding="none" className="border-slate-200 bg-white overflow-hidden shadow-soft">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Ingest New Central Act</h3>
                <p className="text-xs text-slate-500">Upload official gazette PDF to parse and embed statutory sections</p>
              </div>
            </div>

            <form action="/api/acts/ingest" method="POST" encType="multipart/form-data" className="p-6 space-y-4">
              <div>
                <Label>Statute Official PDF *</Label>
                <input
                  type="file"
                  name="file"
                  accept=".pdf"
                  required
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer border border-slate-200 rounded-lg p-1.5 bg-slate-50/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Act Official Title *</Label>
                  <Input
                    name="name"
                    required
                    placeholder="Indian Contract Act"
                  />
                </div>
                <div>
                  <Label>Enactment Year</Label>
                  <Input
                    name="year"
                    type="number"
                    placeholder="1872"
                  />
                </div>
                <div>
                  <Label>Version Tag</Label>
                  <Input
                    name="version"
                    placeholder="v1.0 (Amended)"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="default" size="default">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Ingest & Index Act
                </Button>
              </div>
            </form>
          </Card>

          {/* Published Acts List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Firm Repository Acts ({acts.length})
              </h2>
            </div>

            <div className="grid gap-3">
              {acts.length === 0 ? (
                <Card variant="default" padding="lg" className="text-center py-12 border-dashed">
                  <p className="text-xs text-slate-500">No Central Acts ingested yet. Upload an Act PDF above to provide firm-wide citations.</p>
                </Card>
              ) : (
                acts.map((a: any) => (
                  <Card key={a.id} variant="default" padding="none" className="p-4 border-slate-200 bg-white hover:border-slate-300 transition-all shadow-subtle">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/admin/acts/${a.id}`}
                            className="font-semibold text-sm text-slate-900 hover:text-blue-600 transition-colors truncate"
                          >
                            {a.name}{a.year ? `, ${a.year}` : ""}
                          </Link>
                          <Badge variant={a.is_published ? "open" : "default"} dot>
                            {a.is_published ? "Published" : "Draft"}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">
                          {a.version || "v1.0"} · {a.section_count || 0} parsed sections with embeddings
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/admin/acts/${a.id}`}>
                          <Button variant="outline" size="sm" className="text-xs h-8">
                            Review Sections
                          </Button>
                        </Link>
                        <form action={`/api/acts/${a.id}/publish`} method="POST" className="inline">
                          <input type="hidden" name="isPublished" value={String(!a.is_published)} />
                          <Button
                            type="submit"
                            size="sm"
                            variant={a.is_published ? "secondary" : "default"}
                            className="text-xs h-8"
                          >
                            {a.is_published ? "Unpublish" : "Publish to Firm"}
                          </Button>
                        </form>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
