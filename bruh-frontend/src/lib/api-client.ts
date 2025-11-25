import { env } from "@/config/env";
import urlJoin from "url-join";

type RequestConfig = {
  headers?: Record<string, string>;
  withCredentials?: boolean;
  maxContentLength?: number;
  maxBodyLength?: number;
};

interface StreamChunk {
  content?: string;
  status?:
    | "generating"
    | "cancelled"
    | "error"
    | "tool_call"
    | "done"
    | "waiting"
    | "created";
  error?: string;
  conversation_uuid?: string;
  tool_calls?: Array<{
    id: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_results?: Array<{
    tool_call_id: string;
    name?: string;
    result?: any;
    error?: string;
  }>;
}

function getTokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000;
  } catch {
    return Date.now();
  }
}

function authRequestHeaders(): Headers {
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });

  const tokens = localStorage.getItem("auth_tokens");
  if (tokens) {
    const authTokens = JSON.parse(tokens);
    headers.set("Authorization", `Bearer ${authTokens.access}`);
  }

  return headers;
}

class ApiClient {
  private baseURL: string;
  private defaultConfig: RequestConfig;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseURL: string, config: RequestConfig = {}) {
    this.baseURL = baseURL;
    this.defaultConfig = {
      withCredentials: true,
      maxContentLength: 200 * 1024 * 1024,
      maxBodyLength: 200 * 1024 * 1024,
      ...config,
    };
  }

  private async refreshToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      console.log("[ApiClient] Token refresh already in progress, waiting...");
      return this.refreshPromise;
    }

    console.log("[ApiClient] Starting token refresh due to 401 error...");
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const tokens = localStorage.getItem("auth_tokens");
        if (!tokens) {
          console.log("[ApiClient] No tokens found in localStorage");
          return null;
        }

        const authTokens = JSON.parse(tokens);

        const response = await fetch(this.getFullURL("/token/refresh"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh: authTokens.refresh }),
        });

        if (!response.ok) {
          console.error(
            "[ApiClient] Token refresh request failed with status:",
            response.status,
          );
          throw new Error("Token refresh failed");
        }

        const data = await response.json();
        const expiresAt = getTokenExpiry(data.access);

        const newTokens = {
          access: data.access,
          refresh: data.refresh,
          expiresAt,
        };

        localStorage.setItem("auth_tokens", JSON.stringify(newTokens));
        console.log(
          "[ApiClient] ✅ Token refresh successful! New expiry:",
          new Date(expiresAt).toLocaleString(),
        );
        return data.access;
      } catch (error) {
        console.error("[ApiClient] ❌ Token refresh error:", error);
        localStorage.removeItem("auth_tokens");
        localStorage.removeItem("auth_username");
        console.log("[ApiClient] Redirecting to login...");
        window.location.href = "/login";
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private getHeaders(config: RequestConfig = {}): Headers {
    const isStreaming = config.headers?.Accept === "text/event-stream";
    const headers = new Headers();

    // Set default headers
    headers.set("Content-Type", "application/json");
    headers.set(
      "Accept",
      isStreaming ? "text/event-stream" : "application/json",
    );

    // Add any custom headers from config
    if (config.headers) {
      Object.entries(config.headers).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    // Add auth token if available
    const tokens = localStorage.getItem("auth_tokens");
    if (tokens) {
      const authTokens = JSON.parse(tokens);
      headers.set("Authorization", `Bearer ${authTokens.access}`);
    }

    return headers;
  }

  private async handleResponse(
    response: Response,
    retryRequest?: () => Promise<Response>,
  ) {
    if (response.status === 401 && retryRequest) {
      console.log(
        "[ApiClient] Received 401 error, attempting token refresh...",
      );
      const newToken = await this.refreshToken();

      if (newToken) {
        console.log("[ApiClient] Retrying original request with new token...");
        const retryResponse = await retryRequest();

        if (retryResponse.ok) {
          console.log("[ApiClient] Retry successful after token refresh");
          return retryResponse;
        } else {
          console.log("[ApiClient] Retry failed even after token refresh");
        }
      }

      // If refresh failed or retry failed, redirect to login
      console.log("[ApiClient] Redirecting to login due to auth failure...");
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      let errorMessage = "Network response was not ok";
      let errorData;

      try {
        errorData = await response.json();
        errorMessage = errorData.message || errorData.detail || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }

      // Handle unauthorized access
      if (response.status === 401) {
        window.location.href = "/login";
      }

      throw new Error(errorMessage);
    }
    return response;
  }

  private getFullURL(endpoint: string): string {
    const base = this.baseURL.startsWith("http")
      ? this.baseURL
      : `${window.location.origin}/${this.baseURL}`;

    return urlJoin(base, endpoint).replace(/([^:]\/)\/+/g, "$1");
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(this.getFullURL(endpoint));
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const makeRequest = () =>
      fetch(url.toString(), {
        method: "GET",
        headers: authRequestHeaders(),
        credentials: "include",
      });

    const response = await makeRequest();
    const finalResponse = await this.handleResponse(response, makeRequest);
    return finalResponse.json();
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    config: RequestConfig = {},
  ): Promise<T> {
    try {
      const headers = this.getHeaders(config);

      const isFormData = data instanceof FormData;
      if (isFormData) {
        headers.delete("Content-Type");
      }

      const makeRequest = () =>
        fetch(this.getFullURL(endpoint), {
          method: "POST",
          headers: headers,
          credentials: "include",
          body: isFormData ? data : JSON.stringify(data),
        });

      const response = await makeRequest();

      if (config.headers?.Accept === "text/event-stream") {
        return response.body as unknown as T;
      }

      const finalResponse = await this.handleResponse(response, makeRequest);
      return finalResponse.json();
    } catch (error) {
      console.error("API Client Error:", error);
      throw error;
    }
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const makeRequest = () =>
      fetch(this.getFullURL(endpoint), {
        method: "PUT",
        headers: authRequestHeaders(),
        credentials: "include",
        body: JSON.stringify(data),
      });

    const response = await makeRequest();
    const finalResponse = await this.handleResponse(response, makeRequest);
    return finalResponse.json();
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const makeRequest = () =>
      fetch(this.getFullURL(endpoint), {
        method: "PATCH",
        headers: authRequestHeaders(),
        credentials: "include",
        body: JSON.stringify(data),
      });

    const response = await makeRequest();
    const finalResponse = await this.handleResponse(response, makeRequest);
    return finalResponse.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    const makeRequest = () =>
      fetch(this.getFullURL(endpoint), {
        method: "DELETE",
        headers: authRequestHeaders(),
        credentials: "include",
      });

    const response = await makeRequest();
    const finalResponse = await this.handleResponse(response, makeRequest);
    return finalResponse.json();
  }

  async streamCompletion(
    data: unknown,
    onChunk: (chunk: string | StreamChunk) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      const response = await fetch(this.getFullURL("/completions/chat"), {
        method: "POST",
        headers: this.getHeaders({
          headers: {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
          },
        }),
        credentials: "include",
        body: JSON.stringify(data),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Stream response error:", response.status, errorText);
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`,
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        console.error("No reader available from response");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      if (signal) {
        signal.addEventListener("abort", () => {
          reader.cancel("User cancelled the request").catch((err) => {
            console.error("Error cancelling reader:", err);
          });
        });
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        buffer += text;

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.slice(6);
              if (!jsonStr.trim()) continue;

              const data = JSON.parse(jsonStr);
              onChunk(data);

              if (data.status === "cancelled") {
                console.log("Received cancellation status from server");
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e, "Line:", line);
            }
          }
        }
      }

      if (buffer.trim() && buffer.startsWith("data: ")) {
        try {
          const jsonStr = buffer.slice(6);
          if (jsonStr.trim()) {
            const data = JSON.parse(jsonStr);
            onChunk(data);
          }
        } catch (e) {
          console.error("Error parsing final SSE data:", e);
        }
      }
    } catch (error: any) {
      console.error("Stream error:", error);
      if (error.name === "AbortError") {
        console.log("Stream aborted by client");
        throw error;
      }
      throw error;
    }
  }
}

export const api = new ApiClient(urlJoin("/", env.BACKEND_API_VERSION));

export default api;
