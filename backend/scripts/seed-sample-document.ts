import "dotenv/config";
import { Pool } from "pg";
import { getEmbeddingProvider } from "@/lib/embedding";
import { ensureCollection, upsertChunks } from "@/lib/qdrant";
import { chunkPages } from "@/lib/chunk";
import { query, queryOne, transaction } from "@/lib/db";

const SAMPLE_TEXT = `IN THE SUPREME COURT OF INDIA
CIVIL ORIGINAL JURISDICTION
WRIT PETITION (CIVIL) NO. 112 OF 2024

BETWEEN

Vikram Mehta, ... Petitioner
Versus
Union of India, ... Respondent

AFFIDAVIT IN SUPPORT OF THE PETITION

I, Vikram Mehta, son of Late Prakash Mehta, aged 45 years, resident of B-12, 
Connaught Place, New Delhi, do hereby solemnly affirm and state as follows:

1. That I am the petitioner in the above matter and am fully acquainted with the 
facts and circumstances of the case and hence competent to swear this affidavit.

2. That the petitioner entered into a contract with the respondent through its 
department, the Ministry of Commerce, for the supply of industrial machinery 
valued at INR 3.2 crores, vide purchase order No. MC/PRO/2023/456 dated 15th 
March 2023.

3. That under Section 73 of the Indian Contract Act, 1872, the petitioner is 
entitled to compensation for loss or damage caused by the breach of contract. 
The respondent failed to accept delivery of the machinery despite the petitioner 
having tendered performance on 10th September 2023, thereby committing a breach.

4. That the petitioner has suffered financial loss to the tune of INR 65 lakhs 
including storage charges, demurrage, and depreciation of the machinery.

5. That the respondent has not raised any valid defence under the Indian Contract 
Act, 1872 and the claim is maintainable.

6. That the petitioner seeks a direction to the respondent to either accept 
delivery of the machinery or pay compensation of INR 65 lakhs with interest.

VERIFICATION

I, Vikram Mehta, do hereby verify that the contents of paragraphs 1 to 6 are true 
to my knowledge and nothing material has been concealed.

Verified at New Delhi on this 5th day of October 2024.

DEPONENT
(Vikram Mehta)`;

async function main() {
  const matter = await queryOne<{ id: string; owner_id: string }>(
    "SELECT id, owner_id FROM matters WHERE name ILIKE '%Vikram Mehta%' LIMIT 1"
  );
  if (!matter) {
    console.error("Sample matter not found. Run scripts/setup-db.ts first.");
    process.exit(1);
  }

  const doc = await queryOne<{ id: string }>(
    `INSERT INTO documents (matter_id, owner_id, filename, original_name, mime_type, size, status)
     VALUES ($1,$2,$3,$4,$5,$6,'UPLOADED') RETURNING id`,
    [matter.id, matter.owner_id, "sample_affidavit.pdf", "Affidavit - Vikram Mehta v. Union of India.pdf", "application/pdf", Buffer.byteLength(SAMPLE_TEXT, "utf8")]
  );
  if (!doc) throw new Error("Failed to insert document");

  const pages = [{ page: 1, text: SAMPLE_TEXT }];
  const chunks = chunkPages(pages, { chunkSize: 700, overlap: 100 });
  const provider = getEmbeddingProvider();
  const vectors = await provider.embed(chunks.map((c) => c.content));
  await ensureCollection();

  const points: any[] = [];
  const rows: any[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const qdrantId = crypto.randomUUID();
    points.push({
      id: qdrantId,
      vector: vectors[i],
      payload: {
        document_id: doc.id, matter_id: matter.id, owner_id: matter.owner_id,
        scope: "PRIVATE", filename: "Affidavit - Vikram Mehta v. Union of India.pdf",
        page: chunks[i].page, chunk_id: chunks[i].chunkId, content: chunks[i].content,
      },
    });
    rows.push([doc.id, matter.id, matter.owner_id, "PRIVATE", chunks[i].content, chunks[i].page, chunks[i].chunkId, qdrantId]);
  }
  await upsertChunks(points);

  await transaction(async (pgClient: any) => {
    for (const row of rows) {
      await pgClient.query(
        `INSERT INTO document_chunks (document_id, matter_id, owner_id, scope, content, page, chunk_id, qdrant_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        row
      );
    }
    await pgClient.query(`UPDATE documents SET status='READY', page_count=1 WHERE id=$1`, [doc.id]);
  });

  console.log("Sample document seeded:");
  console.log("  document_id:", doc.id);
  console.log("  matter_id:", matter.id);
  console.log("  chunks:", chunks.length);
  console.log("  Try chatting: 'What compensation does the petitioner seek?'");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
