"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { FileText, Upload, CheckCircle2, Clock, AlertTriangle, Loader2 } from "lucide-react";

export interface DocItem {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string | null;
  size: number | null;
  status: string;
  page_count: number | null;
  error: string | null;
  created_at: string;
}

interface DocumentListProps {
  matterId: string;
  onDocumentReady?: () => void;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ matterId, onDocumentReady }: DocumentListProps) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch(`/api/matters/${matterId}/documents`);
      if (!res.ok) return;
      const data = await res.json();
      setDocs(data.documents || []);
    } catch {}
  }, [matterId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setUploadError(null);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || uploading) return;
    setUploading(true);
    setUploadError(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`/api/matters/${matterId}/documents`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchDocs();
      onDocumentReady?.();
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  }

  function renderStatus(status: string) {
    switch (status) {
      case "READY":
        return (
          <Badge variant="open" dot>
            Ready
          </Badge>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            <Loader2 className="w-3 h-3 animate-spin" />
            Indexing
          </span>
        );
      case "FAILED":
        return (
          <Badge variant="danger" dot>
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="default" dot>
            Uploaded
          </Badge>
        );
    }
  }

  return (
    <div className="space-y-3 font-sans">
      {/* Upload area */}
      <form onSubmit={handleUpload} className="space-y-2">
        <label
          htmlFor="doc-upload"
          className={`flex flex-col items-center justify-center p-3 rounded-xl border border-dashed transition-all cursor-pointer ${
            file
              ? "border-blue-500 bg-blue-50/50"
              : "border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50"
          }`}
        >
          <input
            ref={fileInputRef}
            id="doc-upload"
            type="file"
            accept=".pdf,.docx,.txt"
            className="sr-only"
            onChange={handleFileChange}
          />
          <div className="flex items-center gap-2 text-xs text-slate-800">
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-medium truncate max-w-[180px]">
              {file ? file.name : "Upload Evidence / File"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">
            {file ? formatSize(file.size) : "PDF, DOCX, TXT (up to 25MB)"}
          </span>
        </label>

        {uploadError && (
          <p className="text-[11px] text-rose-600 font-medium">{uploadError}</p>
        )}

        {file && (
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={uploading}
              isLoading={uploading}
              className="flex-1 h-7 text-xs"
            >
              Ingest & Index
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="h-7 px-2 text-xs text-slate-500"
            >
              Cancel
            </Button>
          </div>
        )}
      </form>

      {/* Uploaded Documents List */}
      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5 scrollbar-custom">
        {docs.length === 0 ? (
          <div className="p-3 text-center rounded-lg border border-slate-200/80 bg-slate-50/50">
            <p className="text-xs text-slate-400">No case files uploaded yet.</p>
          </div>
        ) : (
          docs.map((d) => (
            <div
              key={d.id}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-subtle"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="shrink-0 p-1 rounded-md bg-slate-100 text-slate-600 mt-0.5">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate" title={d.original_name}>
                      {d.original_name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-medium">
                      {d.size ? <span>{formatSize(d.size)}</span> : null}
                      {d.page_count ? <span>{d.page_count} p.</span> : null}
                      <span>{formatDate(d.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">{renderStatus(d.status)}</div>
              </div>
              {d.error && (
                <p className="text-[10px] text-rose-600 mt-1.5 truncate" title={d.error}>
                  Error: {d.error}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
