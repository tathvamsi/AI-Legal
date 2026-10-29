"use client";

import React from "react";

export interface MarkdownContentProps {
  content: string;
  citations?: any[];
  onCiteSelect?: (citation: any) => void;
  activeCitationIndex?: number | null;
}

export function MarkdownContent({
  content,
  citations = [],
  onCiteSelect,
  activeCitationIndex,
}: MarkdownContentProps) {
  if (!content) return null;

  const blocks = parseBlocks(content);

  return (
    <div className="space-y-3.5 text-sm text-slate-800 leading-relaxed font-sans">
      {blocks.map((block, i) => (
        <BlockRenderer
          key={i}
          block={block}
          citations={citations}
          onCiteSelect={onCiteSelect}
          activeCitationIndex={activeCitationIndex}
        />
      ))}
    </div>
  );
}

interface Block {
  type: "heading" | "paragraph" | "list" | "blockquote" | "code" | "table" | "hr";
  level?: number;
  items?: string[];
  ordered?: boolean;
  text?: string;
  code?: string;
  lang?: string;
  headers?: string[];
  rows?: string[][];
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^(---|___|\*\*\*)\s*$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Code block
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: "code", code: codeLines.join("\n"), lang });
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith(">") || (lines[i].trim() && quoteLines.length > 0 && !lines[i].trim().startsWith("#")))) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    // Lists (unordered)
    if (/^(\s*[-*+]\s+)/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^(\s*[-*+]\s+)/.test(lines[i])) {
        items.push(lines[i].replace(/^(\s*[-*+]\s+)/, "").trim());
        i++;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    // Lists (ordered)
    if (/^(\s*\d+\.\s+)/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^(\s*\d+\.\s+)/.test(lines[i])) {
        items.push(lines[i].replace(/^(\s*\d+\.\s+)/, "").trim());
        i++;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    // Markdown Table
    if (line.includes("|") && lines[i + 1] && /^\s*\|?[-:\s|]+\|?\s*$/.test(lines[i + 1])) {
      const headers = line.split("|").map((c) => c.trim()).filter((_, idx, arr) => !(idx === 0 && !arr[0]) && !(idx === arr.length - 1 && !arr[arr.length - 1]));
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        const row = lines[i].split("|").map((c) => c.trim()).filter((_, idx, arr) => !(idx === 0 && !arr[0]) && !(idx === arr.length - 1 && !arr[arr.length - 1]));
        if (row.length > 0) rows.push(row);
        i++;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Regular paragraph
    const pLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith(">") &&
      !/^(\s*[-*+]\s+)/.test(lines[i]) &&
      !/^(\s*\d+\.\s+)/.test(lines[i]) &&
      !(lines[i].includes("|") && lines[i + 1] && /^\s*\|?[-:\s|]+\|?\s*$/.test(lines[i + 1]))
    ) {
      pLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: pLines.join(" ") });
  }

  return blocks;
}

function BlockRenderer({
  block,
  citations,
  onCiteSelect,
  activeCitationIndex,
}: {
  block: Block;
  citations: any[];
  onCiteSelect?: (citation: any) => void;
  activeCitationIndex?: number | null;
}) {
  switch (block.type) {
    case "heading": {
      const text = block.text || "";
      if (block.level === 1) {
        return <h2 className="text-lg font-bold text-slate-900 mt-4 mb-2 tracking-tight">{renderInline(text, citations, onCiteSelect, activeCitationIndex)}</h2>;
      }
      if (block.level === 2) {
        return <h3 className="text-base font-bold text-slate-900 mt-3 mb-1.5 tracking-tight">{renderInline(text, citations, onCiteSelect, activeCitationIndex)}</h3>;
      }
      if (block.level === 3) {
        return <h4 className="text-sm font-semibold text-slate-900 mt-2 mb-1">{renderInline(text, citations, onCiteSelect, activeCitationIndex)}</h4>;
      }
      return <h5 className="text-xs font-semibold text-slate-900 mt-2 mb-1">{renderInline(text, citations, onCiteSelect, activeCitationIndex)}</h5>;
    }

    case "paragraph": {
      return (
        <p className="leading-relaxed">
          {renderInline(block.text || "", citations, onCiteSelect, activeCitationIndex)}
        </p>
      );
    }

    case "list": {
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag className={`my-2 space-y-1.5 pl-5 ${block.ordered ? "list-decimal" : "list-disc marker:text-blue-500"}`}>
          {(block.items || []).map((item, idx) => (
            <li key={idx} className="leading-relaxed text-slate-800">
              {renderInline(item, citations, onCiteSelect, activeCitationIndex)}
            </li>
          ))}
        </ListTag>
      );
    }

    case "blockquote": {
      return (
        <blockquote className="border-l-3 border-blue-600 bg-slate-50 rounded-r-lg px-4 py-2.5 my-2.5 text-slate-700 italic">
          {renderInline(block.text || "", citations, onCiteSelect, activeCitationIndex)}
        </blockquote>
      );
    }

    case "code": {
      return (
        <div className="my-3 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 text-slate-100 text-xs font-mono shadow-subtle">
          {block.lang && (
            <div className="bg-slate-800/90 px-3.5 py-1.5 text-[10px] text-slate-400 border-b border-slate-800 uppercase tracking-wider font-sans font-medium">
              {block.lang}
            </div>
          )}
          <pre className="p-3.5 overflow-x-auto leading-relaxed">
            <code>{block.code}</code>
          </pre>
        </div>
      );
    }

    case "table": {
      return (
        <div className="my-3 overflow-x-auto rounded-lg border border-slate-200 shadow-subtle">
          <table className="w-full text-left text-xs border-collapse">
            {block.headers && block.headers.length > 0 && (
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {block.headers.map((h, idx) => (
                    <th key={idx} className="px-3.5 py-2.5 font-semibold text-slate-900">
                      {renderInline(h, citations, onCiteSelect, activeCitationIndex)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-100 bg-white">
              {(block.rows || []).map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/60 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2 text-slate-700">
                      {renderInline(cell, citations, onCiteSelect, activeCitationIndex)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "hr": {
      return <hr className="my-4 border-slate-200" />;
    }

    default:
      return null;
  }
}

function renderInline(
  text: string,
  citations: any[],
  onCiteSelect?: (c: any) => void,
  activeCitationIndex?: number | null
): React.ReactNode {
  if (!text) return null;

  const regex = /(\[\d+\]|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Citation [n]
    const citeMatch = part.match(/^\[(\d+)\]$/);
    if (citeMatch) {
      const citeNum = parseInt(citeMatch[1], 10);
      const matchedCitation =
        citations.find((c) => (c.index ?? c.id) === citeNum) ||
        citations[citeNum - 1] || { index: citeNum, sourceName: `Authority [${citeNum}]` };

      const isActive = activeCitationIndex === citeNum;

      return (
        <button
          key={idx}
          type="button"
          onClick={() => onCiteSelect?.(matchedCitation)}
          title={`View Authority [${citeNum}]`}
          className={`inline-flex items-center justify-center font-semibold text-[11px] px-1.5 py-0.5 rounded-md transition-all duration-150 cursor-pointer select-none mx-0.5 align-baseline ${
            isActive
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white"
          }`}
        >
          [{citeNum}]
        </button>
      );
    }

    // Bold **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic *text*
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={idx} className="italic text-slate-700">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Inline code `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={idx}
          className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}
