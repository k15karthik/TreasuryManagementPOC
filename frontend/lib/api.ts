import type {
  AnalysisListItem,
  AnalysisRecord,
  BenchmarkStat,
  ClientProfile,
  FeedbackAction,
  FeedbackRecord,
  FeedbackReason,
  FeedbackStatsResponse,
  HistoricalStatus,
  Product,
  SimilarClient,
  WorkflowEvent,
} from "./types";

// Vercel env vars are sometimes entered with a trailing slash; stripping it here
// keeps every `${API_BASE}${path}` call below from producing "//api/...".
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, "");

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function listProducts(): Promise<Product[]> {
  return getJSON<Product[]>("/api/knowledge/products");
}

export function listAnalyses(): Promise<AnalysisListItem[]> {
  return getJSON<AnalysisListItem[]>("/api/analyses");
}

export function getAnalysis(id: string): Promise<AnalysisRecord> {
  return getJSON<AnalysisRecord>(`/api/analyses/${id}`);
}

export function submitFeedback(
  analysisId: string,
  payload: { product_name: string; action: FeedbackAction; reason?: FeedbackReason; note?: string }
): Promise<FeedbackRecord> {
  return postJSON<FeedbackRecord>(`/api/feedback/analyses/${analysisId}`, payload);
}

export function listFeedback(analysisId: string): Promise<FeedbackRecord[]> {
  return getJSON<FeedbackRecord[]>(`/api/feedback/analyses/${analysisId}`);
}

export function getFeedbackStats(): Promise<FeedbackStatsResponse> {
  return getJSON<FeedbackStatsResponse>("/api/feedback/stats");
}

export function getSimilarClients(analysisId: string): Promise<SimilarClient[]> {
  return getJSON<SimilarClient[]>(`/api/historical/analyses/${analysisId}/similar-clients`);
}

export function getBenchmarks(analysisId: string): Promise<BenchmarkStat[]> {
  return getJSON<BenchmarkStat[]>(`/api/historical/analyses/${analysisId}/benchmarks`);
}

export function getHistoricalStatus(): Promise<HistoricalStatus> {
  return getJSON<HistoricalStatus>("/api/historical/status");
}

export function triggerReindex(): Promise<{ status: string; count: number }> {
  return postJSON<{ status: string; count: number }>("/api/historical/reindex", {});
}

/**
 * POSTs the client intake form and streams back Server-Sent Events describing each
 * agent's live progress. Native `EventSource` can't send a POST body, so this parses
 * the `text/event-stream` framing manually off a fetch ReadableStream.
 */
export async function streamAnalysis(
  client: ClientProfile,
  onEvent: (event: WorkflowEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/analyses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(client),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Failed to start analysis: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const rawEvent of events) {
      const line = rawEvent.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const jsonStr = line.slice("data: ".length);
      try {
        onEvent(JSON.parse(jsonStr) as WorkflowEvent);
      } catch {
        // Ignore malformed frames rather than aborting the whole stream.
      }
    }
  }
}
