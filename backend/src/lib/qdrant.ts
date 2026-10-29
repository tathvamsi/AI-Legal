const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const VECTOR_DIM = Number(process.env.EMBEDDING_DIM || 384);
const COLLECTION = "soli_documents";

async function qdrantFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${QDRANT_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch {}
    throw new Error(`Qdrant API ${res.status}: ${body}`);
  }
  return res.json();
}

export interface PointStruct {
  id: string;
  vector: number[];
  payload: Record<string, any>;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: any;
}

export async function ensureCollection(dim: number = VECTOR_DIM) {
  try {
    const collections: any = await qdrantFetch("/collections");
    const exists = collections.result.collections.some((c: any) => c.name === COLLECTION);
    if (!exists) {
      await qdrantFetch(`/collections/${COLLECTION}`, {
        method: "PUT",
        body: JSON.stringify({ vectors: { size: dim, distance: "Cosine" } }),
      });
    }
  } catch (err: any) {
    // If collection creation fails because it already exists, ignore.
    if (!err.message.includes("already exist")) throw err;
  }
  return COLLECTION;
}

export async function upsertChunks(points: PointStruct[]) {
  if (!points.length) return;
  await qdrantFetch(`/collections/${COLLECTION}/points`, {
    method: "PUT",
    body: JSON.stringify({ wait: true, points }),
  });
}

export async function searchChunks(
  vector: number[],
  { ownerId, matterId, scope, limit = 10 }: { ownerId?: string; matterId?: string; scope?: string; limit?: number }
): Promise<SearchResult[]> {
  const must: any[] = [];
  if (ownerId) must.push({ key: "owner_id", match: { value: ownerId } });
  if (matterId) must.push({ key: "matter_id", match: { value: matterId } });
  if (scope) must.push({ key: "scope", match: { value: scope } });

  const res: any = await qdrantFetch(`/collections/${COLLECTION}/points/search`, {
    method: "POST",
    body: JSON.stringify({
      vector,
      limit,
      filter: must.length ? { must } : undefined,
      with_payload: true,
      with_vectors: false,
    }),
  });
  return res.result.map((r: any) => ({
    id: String(r.id),
    score: r.score ?? 0,
    payload: r.payload ?? {},
  }));
}

export async function deleteChunksByDocument(documentId: string) {
  await qdrantFetch(`/collections/${COLLECTION}/points/delete`, {
    method: "POST",
    body: JSON.stringify({
      wait: true,
      points: { selector: { points: [] } },
      filter: { must: [{ key: "document_id", match: { value: documentId } }] },
    }),
  });
}

export async function deleteChunksByMatter(matterId: string, ownerId: string) {
  await qdrantFetch(`/collections/${COLLECTION}/points/delete`, {
    method: "POST",
    body: JSON.stringify({
      wait: true,
      filter: {
        must: [
          { key: "matter_id", match: { value: matterId } },
          { key: "owner_id", match: { value: ownerId } },
        ],
      },
    }),
  });
}
