import { env } from "@/config/env";
import urlJoin from "url-join";

type RequestConfig = {
  headers?: Record<string, string>;
  withCredentials?: boolean;
  maxContentLength?: number;
  maxBodyLength?: number;
};

function getTokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000;
  } catch {
    return Date.now();
  }
}
class ApiClient {
  private baseURL: string;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private isTokenValid(): boolean {
    const tokens = localStorage.getItem("auth_tokens");
    if (!tokens) {
      return false;
    }

    try {
      const authTokens = JSON.parse(tokens);
      const expiresAt = authTokens.expiresAt || authTokens.expires_at;

      if (!expiresAt) {
        return false;
      }

      // Add 30 second buffer to refresh before actual expiry
      const isValid = expiresAt > Date.now() + 30000;

      if (!isValid) {
        console.log("[ApiClient] Token is expired or expiring soon");
      }

      return isValid;
    } catch {
      return false;
    }
  }

  private async ensureValidToken(): Promise<void> {
    // Skip validation for auth endpoints
    if (this.isRefreshing) {
      await this.refreshPromise;
      return;
    }

    if (!this.isTokenValid()) {
      console.log("[ApiClient] Token invalid, refreshing proactively...");
      await this.refreshToken();
    }
  }

  private async refreshToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      console.log("[ApiClient] Token refresh already in progress, waiting...");
      return this.refreshPromise;
    }

    console.log("[ApiClient] Starting token refresh...");
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
        "[ApiClient] Received 401 error, attempting token refresh as fallback...",
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
    // Skip token check for auth endpoints
    if (!endpoint.includes("/token/")) {
      await this.ensureValidToken();
    }

    const url = new URL(this.getFullURL(endpoint));
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const makeRequest = () =>
      fetch(url.toString(), {
        method: "GET",
        headers: this.getHeaders(),
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
      // Skip token check for auth endpoints
      if (!endpoint.includes("/token/")) {
        await this.ensureValidToken();
      }

      const isFormData = data instanceof FormData;

      const makeRequest = () => {
        const headers = this.getHeaders(config);

        if (isFormData) {
          headers.delete("Content-Type");
        }

        return fetch(this.getFullURL(endpoint), {
          method: "POST",
          headers: headers,
          credentials: "include",
          body: isFormData ? data : JSON.stringify(data),
        });
      };

      const response = await makeRequest();

      if (config.headers?.Accept === "text/event-stream") {
        const finalResponse = await this.handleResponse(response, makeRequest);
        console.log("[ApiClient] Returning streaming response body");
        return finalResponse.body as unknown as T;
      }

      const finalResponse = await this.handleResponse(response, makeRequest);
      return finalResponse.json();
    } catch (error) {
      console.error("API Client Error:", error);
      throw error;
    }
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    await this.ensureValidToken();

    const makeRequest = () =>
      fetch(this.getFullURL(endpoint), {
        method: "PUT",
        headers: this.getHeaders(),
        credentials: "include",
        body: JSON.stringify(data),
      });

    const response = await makeRequest();
    const finalResponse = await this.handleResponse(response, makeRequest);
    return finalResponse.json();
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    await this.ensureValidToken();

    const isFormData = data instanceof FormData;

    const makeRequest = () => {
      const headers = this.getHeaders();

      if (isFormData) {
        headers.delete("Content-Type");
      }

      return fetch(this.getFullURL(endpoint), {
        method: "PATCH",
        headers: headers,
        credentials: "include",
        body: isFormData ? data : JSON.stringify(data),
      });
    };

    const response = await makeRequest();
    const finalResponse = await this.handleResponse(response, makeRequest);
    return finalResponse.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    await this.ensureValidToken();

    const makeRequest = () =>
      fetch(this.getFullURL(endpoint), {
        method: "DELETE",
        headers: this.getHeaders(),
        credentials: "include",
      });

    const response = await makeRequest();
    const finalResponse = await this.handleResponse(response, makeRequest);

    const text = await finalResponse.text();
    return text ? JSON.parse(text) : (undefined as T);
  }
}

export const api = new ApiClient(urlJoin("/", env.BACKEND_API_VERSION));

export default api;
