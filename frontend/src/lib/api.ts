import { useSessionStore } from "@/store/sessionStore";
import { supabase } from "@/integrations/supabase/client";
import type {
  UploadResponse,
  SessionStatusResponse,
  AnalysisSummary,
  VisualizationsResponse,
  InsightsResponse,
  ForecastResponse,
  Message,
  QAResponse,
  Insight,
} from "./types";

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

async function getAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    if (typeof window !== "undefined") {
      await supabase.auth.signOut();
      window.location.href = "/auth";
    }
    throw new Error("Not authenticated");
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

async function handleResponse(response: Response): Promise<Response> {
  if (response.status === 401) {
    const isExpired = response.headers.get("X-Token-Expired") === "true";
    if (isExpired) {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        if (typeof window !== "undefined") window.location.href = "/auth";
        throw new Error("Session expired");
      }
      throw new Error("TOKEN_REFRESHED");
    }
    if (typeof window !== "undefined") {
      await supabase.auth.signOut();
      window.location.href = "/auth";
    }
    throw new Error("Unauthorized");
  }
  return response;
}

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const reqOptions = {
    ...options,
    headers: { ...authHeaders, ...options?.headers },
  };
  let response = await fetch(url, reqOptions);

  if (response.status === 401) {
    try {
      await handleResponse(response);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "TOKEN_REFRESHED") {
        const newAuthHeaders = await getAuthHeaders();
        response = await fetch(url, {
          ...options,
          headers: { ...newAuthHeaders, ...options?.headers },
        });
      } else {
        throw e;
      }
    }
  }

  if (!response.ok) {
    let errorMsg = "Unknown error";
    try {
      const errBody = await response.json();
      errorMsg = errBody.error || errorMsg;
    } catch {
      errorMsg = response.statusText;
    }
    throw new Error(errorMsg);
  }
  return response.json() as Promise<T>;
}

export async function uploadCSV(
  file: File,
  preferences = "{}",
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("preferences", preferences);

  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/api/v1/upload`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });
  await handleResponse(response);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error ?? "Upload failed");
  }
  return response.json();
}

export async function getSessionStatus(
  sessionId: string,
): Promise<SessionStatusResponse> {
  return fetcher<SessionStatusResponse>(
    `${BASE_URL}/api/v1/session/${sessionId}/status`,
  );
}

export async function getAnalysis(sessionId: string): Promise<AnalysisSummary> {
  const data = await fetcher<Record<string, Record<string, unknown>>>(
    `${BASE_URL}/api/v1/session/${sessionId}/analysis`,
  );
  const edaSummary = data.eda_summary as Record<string, unknown> | undefined;
  const cleaningReport = data.cleaning_report as
    | Record<string, unknown>
    | undefined;
  const anomaly = data.anomaly as Record<string, unknown> | undefined;
  const cluster = data.cluster as Record<string, unknown> | undefined;

  return {
    row_count:
      (edaSummary?.row_count as number) ||
      (cleaningReport?.final_rows as number) ||
      0,
    col_count:
      (edaSummary?.col_count as number) ||
      (cleaningReport?.final_cols as number) ||
      0,
    anomaly_count: (anomaly?.total_anomalies as number) || 0,
    anomaly_pct: (anomaly?.anomaly_pct as number) || 0,
    cluster_count:
      (cluster?.k as number) ||
      (cluster?.cluster_sizes
        ? Object.keys(cluster.cluster_sizes as object).length
        : 0),
    top_correlations:
      (edaSummary?.top_correlations as AnalysisSummary["top_correlations"]) ||
      [],
  };
}

export async function getVisualizations(
  sessionId: string,
): Promise<VisualizationsResponse> {
  return fetcher<VisualizationsResponse>(
    `${BASE_URL}/api/v1/session/${sessionId}/visualizations`,
  );
}

export async function getInsights(
  sessionId: string,
): Promise<InsightsResponse> {
  const data = await fetcher<Insight[]>(
    `${BASE_URL}/api/v1/session/${sessionId}/insights`,
  );
  return { session_id: sessionId, insights: data };
}

export async function getForecast(
  sessionId: string,
): Promise<ForecastResponse> {
  return fetcher<ForecastResponse>(
    `${BASE_URL}/api/v1/session/${sessionId}/forecast`,
  );
}

export async function getConversation(sessionId: string): Promise<Message[]> {
  return fetcher<Message[]>(
    `${BASE_URL}/api/v1/session/${sessionId}/conversation`,
  );
}

export async function askQuestion(
  sessionId: string,
  question: string,
): Promise<QAResponse> {
  const authHeaders = await getAuthHeaders();
  return fetcher<QAResponse>(`${BASE_URL}/api/v1/session/${sessionId}/qa`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
}

export async function downloadReport(sessionId: string): Promise<Blob> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(
    `${BASE_URL}/api/v1/session/${sessionId}/report`,
    { headers: authHeaders },
  );
  await handleResponse(response);
  if (!response.ok) throw new Error("Download failed");
  return response.blob();
}

export async function downloadCleanedCSV(sessionId: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(
    `${BASE_URL}/api/v1/session/${sessionId}/download/cleaned-csv`,
    { headers: authHeaders },
  );
  await handleResponse(response);
  if (!response.ok) throw new Error("Download failed");
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const headerFilename = disposition
    ?.match(/filename="?([^";\n]+)"?/)?.[1]
    ?.trim();
  const storeFilename = useSessionStore.getState().datasetInfo?.cleaned_filename;
  triggerDownload(blob, headerFilename ?? storeFilename ?? "cleaned_data.csv");
}

export async function downloadNotebook(sessionId: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(
    `${BASE_URL}/api/v1/session/${sessionId}/download/notebook`,
    { headers: authHeaders },
  );
  await handleResponse(response);
  if (!response.ok) throw new Error("Download failed");
  const blob = await response.blob();
  const filename =
    response.headers
      .get("Content-Disposition")
      ?.match(/filename="(.+)"/)?.[1] ?? "analysis.ipynb";
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface HistoryItem {
  session_id: string;
  status: string;
  created_at: string;
  original_name: string | null;
  cleaned_filename: string | null;
  row_count: number | null;
  col_count: number | null;
  file_size_bytes: number | null;
  display_name: string | null;
  is_starred: boolean;
  insight_count: number;
  has_forecast: boolean;
  chart_count: number;
  preferences_summary: string | null;
  effective_name: string;
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export async function getHistory(
  page = 1,
  limit = 20,
  starredOnly = false,
): Promise<HistoryResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (starredOnly) params.set("starred_only", "true");
  return fetcher<HistoryResponse>(
    `${BASE_URL}/api/v1/history?${params.toString()}`,
  );
}

export async function updateAnalysisLabel(
  sessionId: string,
  displayName: string | null,
  isStarred: boolean | null,
): Promise<HistoryItem> {
  return fetcher<HistoryItem>(`${BASE_URL}/api/v1/session/${sessionId}/label`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ display_name: displayName, is_starred: isStarred }),
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/api/v1/session/${sessionId}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  await handleResponse(res);
  if (!res.ok) throw new Error("Failed to delete");
}
