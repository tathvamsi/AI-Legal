import mammoth from "mammoth";

async function loadPdfParse() {
  const mod = await import("pdf-parse");
  return (mod as any).default || mod;
}

export interface ExtractedPage {
  page: number;
  text: string;
}

export async function extractPages(
  buffer: Buffer,
  { mimeType, filename }: { mimeType?: string; filename?: string }
): Promise<ExtractedPage[]> {
  const ext = (filename || "").toLowerCase().split(".").pop();
  const mime = (mimeType || "").toLowerCase();

  if (mime === "application/pdf" || ext === "pdf") {
    const pdfParse = await loadPdfParse();
    const data = await pdfParse(buffer);
    const pages: ExtractedPage[] = (data.pages || []).map((t: string, i: number) => ({
      page: i + 1,
      text: t || "",
    }));
    if (pages.length === 0 && data.text) {
      pages.push({ page: 1, text: data.text });
    }
    return pages;
  }

  if (mime.includes("wordprocessingml") || ext === "docx") {
    const { value } = await mammoth.extractRawText({ buffer });
    const text = value || "";
    // DOCX has no native pages; split by form feeds if present, else one page.
    const formFeedParts = text.split("\f").filter((p: string) => p.trim().length > 0);
    if (formFeedParts.length > 1) {
      return formFeedParts.map((t: string, i: number) => ({ page: i + 1, text: t }));
    }
    return [{ page: 1, text }];
  }

  // Plain text / fallback
  const text = buffer.toString("utf8");
  const parts = text.split("\f").filter((p) => p.trim().length > 0);
  if (parts.length > 1) {
    return parts.map((t, i) => ({ page: i + 1, text: t }));
  }
  return [{ page: 1, text }];
}
