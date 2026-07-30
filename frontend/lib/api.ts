import type {
  AnalysisListItem,
  AnalysisRecord,
  ClientProfile,
  FeedbackAction,
  FeedbackRecord,
  FeedbackReason,
  FeedbackStatsResponse,
  Product,
  WorkflowEvent,
} from "./types";

// Vercel env vars are sometimes entered with a trailing slash; stripping it here
// keeps every `${API_BASE}${path}` call below from producing "//api/...".
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, "");

// Carries the HTTP status so callers can distinguish "not found" (404 — e.g. this
// analysis genuinely isn't visible from whichever backend instance served this
// request) from a transient network/server failure, rather than treating both as
// an identical opaque error.
export class ApiError extends Error {
  status: number;
  constructor(path: string, status: number) {
    super(`Request to ${path} failed: ${status}`);
    this.status = status;
  }
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new ApiError(path, res.status);
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
    throw new ApiError(path, res.status);
  }
  return res.json() as Promise<T>;
}

export function listProducts(): Promise<Product[]> {
  return getJSON<Product[]>("/api/knowledge/products");
}

export function listAnalyses(): Promise<AnalysisListItem[]> {
  return getJSON<AnalysisListItem[]>("/api/analyses");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Right after an analysis is created, the redirect to view it can land on a different
// backend instance than the one that just wrote it — the write is real, but briefly
// invisible from wherever this particular request lands. A couple of short retries on a
// 404 covers that window without treating a genuine "not found" or network error any
// differently (those still throw immediately).
export async function getAnalysis(id: string): Promise<AnalysisRecord> {
  const retryDelaysMs = [0, 400, 900];
  let lastError: unknown;
  for (const delay of retryDelaysMs) {
    if (delay) await sleep(delay);
    try {
      return await getJSON<AnalysisRecord>(`/api/analyses/${id}`);
    } catch (err) {
      lastError = err;
      if (!(err instanceof ApiError) || err.status !== 404) throw err;
    }
  }
  throw lastError;
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
