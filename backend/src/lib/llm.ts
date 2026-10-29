import { generateLegalAgentResponse, AgentSource } from "./agent";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMProvider {
  streamText(params: {
    messages: Message[];
    onToken: (token: string) => void;
    signal?: AbortSignal;
  }): Promise<{ text: string; citations: any[] }>;
}

export function buildMockAnswer(context: string, question: string): { text: string; citations: any[] } {
  const cleanedContext = (context || "").replace(/^\[CONTEXT\]\s*/, "").trim();
  const sourceBlocks = cleanedContext
    ? cleanedContext
        .split(/\n\n+/)
        .map((b) => b.trim())
        .filter((b) => b.length > 0 && /^\[\d+\]/.test(b))
    : [];

  const parsedSources: AgentSource[] = sourceBlocks.map((block, i) => {
    const lines = block.split("\n");
    const header = lines[0] || "";
    const excerpt = lines.slice(1).join(" ").trim() || header;
    const isLegislation = header.includes("LEGISLATION");
    const sectionMatch = header.match(/§([^\s|]+)/);
    const pageMatch = header.match(/p\.([^\s|]+)/);

    return {
      index: i + 1,
      sourceType: isLegislation ? "LEGISLATION" : "CASE_FILE",
      sourceName: header.split("|")[1]?.trim() || "Case Record",
      section: sectionMatch ? sectionMatch[1] : null,
      page: pageMatch ? parseInt(pageMatch[1], 10) : null,
      excerpt,
      scope: header.includes("SHARED") ? "SHARED" : "PRIVATE",
    };
  });

  return generateLegalAgentResponse({
    message: question,
    sources: parsedSources,
  });
}

export class MockLLMProvider implements LLMProvider {
  async streamText({
    messages,
    onToken,
    signal,
  }: {
    messages: Message[];
    onToken: (t: string) => void;
    signal?: AbortSignal;
  }): Promise<{ text: string; citations: any[] }> {
    const userMsg = [...messages].reverse().find((m) => m.role === "user");
    const question = userMsg ? userMsg.content : "";
    const context = contextForMock(messages);

    const { text, citations } = buildMockAnswer(context, question);

    const words = text.split(/(\s+)/).filter(Boolean);
    for (const w of words) {
      if (signal?.aborted) break;
      onToken(w);
      await new Promise((r) => setTimeout(r, 8));
    }
    return { text, citations };
  }
}

function getProvider(): LLMProvider {
  const name = (process.env.DEFAULT_LLM_PROVIDER || "mock").toLowerCase();
  if (name === "openai" && process.env.OPENAI_API_KEY) return new OpenAILLMProvider();
  if (name === "anthropic" && process.env.ANTHROPIC_API_KEY) return new AnthropicLLMProvider();
  if (name === "nvidia" && process.env.NVIDIA_API_KEY) return new NVIDIALLMProvider();
  return new MockLLMProvider();
}

let cached: LLMProvider | null = null;
export function getLLMProvider(): LLMProvider {
  if (!cached) cached = getProvider();
  return cached;
}

// Helper to parse OpenAI-style SSE lines incrementally
async function readOpenAISSEStream(
  body: ReadableStream<Uint8Array>,
  onToken: (t: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  let fullReasoning = "";

  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta;
          if (delta?.content) {
            fullContent += delta.content;
            onToken(delta.content);
          } else if (delta?.reasoning_content) {
            fullReasoning += delta.reasoning_content;
          }
        } catch {
          // ignore malformed lines
        }
      }
    }

    if (buffer.trim().startsWith("data: ")) {
      const payload = buffer.trim().slice(6);
      if (payload !== "[DONE]") {
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta;
          if (delta?.content) {
            fullContent += delta.content;
            onToken(delta.content);
          } else if (delta?.reasoning_content) {
            fullReasoning += delta.reasoning_content;
          }
        } catch {}
      }
    }
  } finally {
    reader.releaseLock();
  }

  // If content was produced, return clean answer
  if (fullContent.trim()) {
    return fullContent;
  }
  // If only reasoning was produced, stream and return that as fallback
  if (fullReasoning.trim()) {
    onToken(fullReasoning);
    return fullReasoning;
  }

  return "";
}

// ---- OpenAI (chat completions, streaming) ----

export class OpenAILLMProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  async streamText({
    messages,
    onToken,
    signal,
  }: {
    messages: Message[];
    onToken: (t: string) => void;
    signal?: AbortSignal;
  }): Promise<{ text: string; citations: any[] }> {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY not set");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        temperature: 0.2,
      }),
      signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`OpenAI error: ${res.status} ${t}`);
    }
    if (!res.body) throw new Error("OpenAI returned no body");

    const fullText = await readOpenAISSEStream(res.body, onToken, signal);
    return { text: fullText, citations: [] };
  }
}

// ---- Anthropic (messages streaming) ----

export class AnthropicLLMProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || "";
    this.model = process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307";
  }

  async streamText({
    messages,
    onToken,
    signal,
  }: {
    messages: Message[];
    onToken: (t: string) => void;
    signal?: AbortSignal;
  }): Promise<{ text: string; citations: any[] }> {
    if (!this.apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const chat = messages.filter((m) => m.role !== "system");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        system,
        messages: chat.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        temperature: 0.2,
        max_tokens: 1024,
      }),
      signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Anthropic error: ${res.status} ${t}`);
    }
    if (!res.body) throw new Error("Anthropic returned no body");

    let fullText = "";
    let buffer = "";
    const reader = res.body.getReader();
    const dec = new TextDecoder();

    try {
      while (true) {
        if (signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += dec.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          try {
            const json = JSON.parse(payload);
            if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
              const textDelta = json.delta.text;
              if (textDelta) {
                fullText += textDelta;
                onToken(textDelta);
              }
            }
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
    }

    return { text: fullText, citations: [] };
  }
}

// ---- NVIDIA NIM (OpenAI-compatible chat completions, streaming) ----

export class NVIDIALLMProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private fallbackModel: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NVIDIA_API_KEY || "";
    this.model = process.env.NVIDIA_MODEL || "nvidia/nemotron-3-ultra-550b-a55b";
    this.fallbackModel = process.env.NVIDIA_FALLBACK_MODEL || "nvidia/nemotron-3.5-bolt-e4b";
    this.baseUrl = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
  }

  private async tryFetchModel(
    targetModel: string,
    messages: Message[],
    signal?: AbortSignal
  ): Promise<Response | null> {
    const connectAbort = new AbortController();
    const connectTimeoutMs = Number(process.env.LLM_CONNECT_TIMEOUT_MS || 20000);
    const timeoutId = setTimeout(() => connectAbort.abort(), connectTimeoutMs);

    // Merge external abort signal with connection timeout
    const onAbort = () => connectAbort.abort();
    if (signal) signal.addEventListener("abort", onAbort);

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          model: targetModel,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
          temperature: 0.2,
          max_tokens: 1500,
        }),
        signal: connectAbort.signal,
      });
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener("abort", onAbort);
      return res;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener("abort", onAbort);
      console.warn(`[SOLI] NVIDIA ${targetModel} attempt failed:`, err.message);
      return null;
    }
  }

  async streamText({
    messages,
    onToken,
    signal,
  }: {
    messages: Message[];
    onToken: (t: string) => void;
    signal?: AbortSignal;
  }): Promise<{ text: string; citations: any[] }> {
    const userMsg = [...messages].reverse().find((m) => m.role === "user");
    const question = userMsg ? userMsg.content : "";

    const runLocalFallback = async () => {
      console.info("[SOLI] Serving response via SOLI Legal Intelligence Engine");
      const { text, citations } = buildMockAnswer(contextForMock(messages), question);
      const words = text.split(/(\s+)/).filter(Boolean);
      for (const w of words) {
        if (signal?.aborted) break;
        onToken(w);
        await new Promise((r) => setTimeout(r, 6));
      }
      return { text, citations };
    };

    if (!this.apiKey) {
      return runLocalFallback();
    }

    // Attempt primary model first
    let res = await this.tryFetchModel(this.model, messages, signal);

    // If primary failed or returned error, try fallback model
    if (!res || !res.ok) {
      if (this.fallbackModel && this.fallbackModel !== this.model) {
        console.warn(`[SOLI] Primary model ${this.model} unavailable (status: ${res?.status || "error"}). Trying fallback ${this.fallbackModel}...`);
        res = await this.tryFetchModel(this.fallbackModel, messages, signal);
      }
    }

    if (!res || !res.ok || !res.body) {
      console.warn(`[SOLI] All NVIDIA NIM models exhausted. Reverting to local legal engine.`);
      return runLocalFallback();
    }

    const fullText = await readOpenAISSEStream(res.body, onToken, signal);
    if (!fullText.trim()) {
      console.warn(`[SOLI] NVIDIA returned empty stream. Reverting to local legal engine.`);
      return runLocalFallback();
    }

    return { text: fullText, citations: [] };
  }
}

function contextForMock(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const c = messages[i].content;
    if (c && c.startsWith("[CONTEXT]")) {
      return c.replace(/^\[CONTEXT\]\n/, "");
    }
  }
  return "";
}
