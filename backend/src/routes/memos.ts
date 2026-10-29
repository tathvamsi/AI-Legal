import { Router, Request, Response } from "express";
import { queryOne } from "../lib/db";
import { authMiddleware } from "../middleware/auth";
import { Packer, Paragraph, TextRun, Document, HeadingLevel, AlignmentType } from "docx";
import PDFDocument from "pdfkit";

const router = Router();
router.use(authMiddleware);

router.post("/", async (req: Request, res: Response) => {
  const session = req.session!;
  const { conversationId, title = "Legal Memo", content = "", citations = [] } = req.body || {};

  if (!conversationId) {
    return res.status(400).json({ error: "Conversation required" });
  }

  try {
    const conv = await queryOne<{ id: string; owner_id: string; matter_id: string | null }>(
      "SELECT id, owner_id, matter_id FROM conversations WHERE id = $1::uuid",
      [conversationId]
    );
    if (!conv || conv.owner_id !== session.userId) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const format = (req.headers.accept || "").includes("application/pdf") ? "pdf" : "docx";
    const fileName = `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.${format}`;

    if (format === "pdf") {
      const pdfBuf = await generatePDF({ title, content, citations });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      return res.send(pdfBuf);
    }

    const docxBuf = await generateDOCX({ title, content, citations });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.send(docxBuf);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate memo" });
  }
});

function generateDOCX({ title, content, citations }: { title: string; content: string; citations: any[] }) {
  const children: Paragraph[] = [
    new Paragraph({
      text: "SOLI — Legal Memorandum",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Prepared by Soli (confidential AI assistant). This memo is generated from retrieved sources and should be reviewed by counsel before filing.",
          italics: true,
          size: 20,
          color: "555555",
        }),
      ],
      spacing: { after: 400 },
    }),
    ...content.split("\n\n").map((block) =>
      new Paragraph({ text: block, spacing: { after: 200 } })
    ),
  ];

  if (citations.length > 0) {
    children.push(
      new Paragraph({
        text: "Sources",
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 400, after: 100 },
      })
    );
    for (let i = 0; i < citations.length; i++) {
      const c = citations[i];
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[${i + 1}] ${c.sourceName || "Source"}${c.section ? `, §${c.section}` : ""}${c.page ? `, p.${c.page}` : ""} — ${c.excerpt || ""}`,
              size: 20,
            }),
          ],
          spacing: { after: 80 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });

  return Packer.toBuffer(doc);
}

async function generatePDF({ title, content, citations }: { title: string; content: string; citations: any[] }) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    const doc = new PDFDocument({ margin: 70 });
    doc.on("data", (c: Uint8Array) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(20).fill("#1a2e4a").text("SOLI — Legal Memorandum", { align: "center" });
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(14).fill("#1a2e4a").text(title, { align: "center" });
    doc.moveDown(0.8);
    doc.font("Helvetica-Oblique").fontSize(9).fill("#555555").text("Prepared by Soli (confidential AI assistant). Review by counsel before filing.", { align: "center" });
    doc.moveDown(1);

    doc.font("Helvetica").fontSize(10.5).fill("#1a1a1a");
    for (const block of content.split("\n\n")) {
      doc.text(block, { align: "justify" });
      doc.moveDown(0.6);
    }

    if (citations.length > 0) {
      doc.moveDown(0.4);
      doc.font("Helvetica-Bold").fontSize(12).fill("#1a2e4a").text("Sources");
      doc.moveDown(0.3);
      doc.font("Helvetica").fontSize(9);
      citations.forEach((c: any, i: number) => {
        doc.text(
          `[${i + 1}] ${c.sourceName || "Source"}${c.section ? `, §${c.section}` : ""}${c.page ? `, p.${c.page}` : ""}\n   ${c.excerpt || ""}`,
          { indent: 20 }
        );
        doc.moveDown(0.25);
      });
    }

    doc.end();
  });
}

export default router;
