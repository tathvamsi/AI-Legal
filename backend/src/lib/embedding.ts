export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

const DIM = Number(process.env.EMBEDDING_DIM || 384);

function stableSeed(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

class Xorshift {
  private state: number;
  constructor(seed: number) {
    this.state = seed || 1;
  }
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.state = x;
    return (x >>> 0) / 0xffffffff;
  }
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  private dim: number;
  constructor(dim: number) {
    this.dim = dim;
  }
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => {
      const rng = new Xorshift(stableSeed(t || " "));
      const v = new Array(this.dim).fill(0).map(() => rng.next() - 0.5);
      const norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1;
      return v.map((x) => x / norm);
    });
  }
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private dim: number;
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    this.model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
    this.dim = Number(process.env.EMBEDDING_DIM || 1536);
  }
  async embed(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY not set");
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: texts.map((t) => (t || "").trim() || " "),
        encoding_format: "float",
        ...(this.model === "text-embedding-3-small" || this.model === "text-embedding-3-large"
          ? { dimensions: this.dim }
          : {}),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI embeddings error: ${res.status} ${text}`);
    }
    const data = await res.json();
    return (data as any).data.map((d: { embedding: number[] }) => d.embedding);
  }
}

let openaiProvider: EmbeddingProvider | null = null;
export function getEmbeddingProvider(): EmbeddingProvider {
  const provider = (process.env.EMBEDDING_PROVIDER || "mock").toLowerCase();
  if (provider === "openai") {
    if (!openaiProvider) openaiProvider = new OpenAIEmbeddingProvider();
    return openaiProvider;
  }
  return new MockEmbeddingProvider(DIM);
}
