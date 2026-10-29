"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, X, Briefcase, Building2, Scale, Hash } from "lucide-react";

export default function CreateMatterForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState({ name: "", client: "", court: "", caseNumber: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createMatter(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/matters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name,
          client: fields.client || null,
          court: fields.court || null,
          caseNumber: fields.caseNumber || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create matter");
      }
      const data = await res.json();
      setOpen(false);
      setFields({ name: "", client: "", court: "", caseNumber: "" });
      router.push(`/matters/${data.matter.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create matter");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="default"
        size="default"
        className="font-medium"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        New Matter
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg">
            <Card variant="elevated" padding="none" className="overflow-hidden border-slate-200 shadow-xl">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Open New Matter Workspace</h2>
                    <p className="text-xs text-slate-500">Create a privileged litigation container</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={createMatter} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    {error}
                  </div>
                )}

                <div>
                  <Label htmlFor="caseName">Case Title / Cause of Action *</Label>
                  <div className="relative">
                    <Input
                      id="caseName"
                      value={fields.name}
                      onChange={(e) => setFields({ ...fields, name: e.target.value })}
                      placeholder="e.g. Vikram Mehta v. Union of India & Ors."
                      required
                      className="pl-9"
                    />
                    <Scale className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientName">Client Name</Label>
                    <div className="relative">
                      <Input
                        id="clientName"
                        value={fields.client}
                        onChange={(e) => setFields({ ...fields, client: e.target.value })}
                        placeholder="Vikram Mehta"
                        className="pl-9"
                      />
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="caseNumber">Case / Petition No.</Label>
                    <div className="relative">
                      <Input
                        id="caseNumber"
                        value={fields.caseNumber}
                        onChange={(e) => setFields({ ...fields, caseNumber: e.target.value })}
                        placeholder="W.P.(C) 4128/2024"
                        className="pl-9"
                      />
                      <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="courtName">Court / Forum</Label>
                  <div className="relative">
                    <Input
                      id="courtName"
                      value={fields.court}
                      onChange={(e) => setFields({ ...fields, court: e.target.value })}
                      placeholder="High Court of Delhi (Civil Writ Jurisdiction)"
                      className="pl-9"
                    />
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    isLoading={loading}
                  >
                    Create Matter
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
