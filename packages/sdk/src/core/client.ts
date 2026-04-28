import type { KeeperHubConfig } from "../types/index.js";
import { resolveKeeperHubConfig } from "./config.js";
import {
  KeeperHubAuthError,
  KeeperHubError,
  KeeperHubNotFoundError,
  KeeperHubPaymentRequiredError,
  KeeperHubRateLimitError,
  KeeperHubValidationError,
} from "./errors.js";

const DEFAULT_BASE_URL = "https://app.keeperhub.com";

/**
 * Validates that baseUrl is a safe HTTPS (or localhost HTTP) URL.
 * Prevents SSRF by rejecting private IP ranges and non-HTTP schemes.
 */
export function validateBaseUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      `[keeperhub-sdk] Invalid baseUrl: "${url}". Must be a valid URL.`
    );
  }

  const { protocol, hostname } = parsed;

  // Allow localhost/127.0.0.1 for local dev without HTTPS
  const isLocalhost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  if (protocol !== "https:" && !isLocalhost) {
    throw new Error(`[keeperhub-sdk] baseUrl must use HTTPS. Got: "${url}"`);
  }

  // Block private IP ranges (SSRF protection)
  const privateRanges =
    /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|fc[0-9a-f]{2}:|fd)/i;
  if (privateRanges.test(hostname)) {
    throw new Error(
      `[keeperhub-sdk] baseUrl points to a private IP range, which is not allowed: "${hostname}"`
    );
  }

  return url;
}
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_ON = [429, 502, 503, 504];

export class HttpClient {
  readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly maxAttempts: number;
  private readonly retryOn: number[];
  private readonly backoff: "exponential" | "linear" | "none";
  private readonly agentContext?: KeeperHubConfig["agentContext"];

  constructor(config: KeeperHubConfig) {
    const resolved = resolveKeeperHubConfig(config);
    const rawBase = (resolved.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.baseUrl = validateBaseUrl(rawBase);
    this.apiKey = resolved.apiKey;
    this.timeout = resolved.timeout ?? DEFAULT_TIMEOUT;
    this.maxAttempts = resolved.retry?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.retryOn = resolved.retry?.retryOn ?? DEFAULT_RETRY_ON;
    this.backoff = resolved.retry?.backoff ?? "exponential";
    this.agentContext = resolved.agentContext;
  }

  async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    options?: {
      body?: unknown;
      query?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    const response = await this.requestResponse(method, path, options);
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  async requestResponse(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    options?: {
      body?: unknown;
      query?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
    }
  ): Promise<Response> {
    const url = this.buildUrl(path, options?.query);

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, {
          method,
          headers: {
            ...this.getAuthHeaders(),
            "Content-Type": "application/json",
            Accept: "application/json",
            ...options?.headers,
          },
          body:
            options?.body === undefined
              ? undefined
              : JSON.stringify(options.body),
        });

        if (response.ok) {
          return response;
        }

        if (response.status === 401) throw new KeeperHubAuthError();
        if (response.status === 402) {
          const paymentRequirements = await response
            .json()
            .catch(() => undefined);
          throw new KeeperHubPaymentRequiredError(
            paymentRequirements,
            this.headersToObject(response.headers)
          );
        }
        if (response.status === 404) {
          throw new KeeperHubNotFoundError(path.split("/").pop());
        }
        if (response.status === 429) {
          const retryAfter =
            Number(response.headers.get("Retry-After")) || undefined;
          lastError = new KeeperHubRateLimitError(retryAfter);

          if (attempt < this.maxAttempts && this.retryOn.includes(429)) {
            await this.sleep(this.backoffDelay(attempt, retryAfter));
            continue;
          }
          throw lastError;
        }
        if (response.status === 422) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string;
            details?: unknown;
          };
          throw new KeeperHubValidationError(
            body.error ?? "Validation failed",
            body.details
          );
        }

        if (
          this.retryOn.includes(response.status) &&
          attempt < this.maxAttempts
        ) {
          const bodyText = await response.text().catch(() => "");
          lastError = new KeeperHubError(
            `Server error ${response.status}${bodyText ? `: ${bodyText.slice(0, 200)}` : ""}`,
            response.status,
            "SERVER_ERROR"
          );
          await this.sleep(this.backoffDelay(attempt));
          continue;
        }

        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new KeeperHubError(
          body.error ?? `Request failed with status ${response.status}`,
          response.status,
          "REQUEST_FAILED"
        );
      } catch (err) {
        if (err instanceof KeeperHubError) throw err;
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxAttempts) {
          await this.sleep(this.backoffDelay(attempt));
        }
      }
    }

    throw lastError ?? new KeeperHubError("Request failed", 500, "UNKNOWN");
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };
    // Attach agent context for per-session observability and audit trails
    if (this.agentContext?.sessionId) {
      headers["X-Agent-Session-Id"] = this.agentContext.sessionId;
    }
    if (this.agentContext?.runId) {
      headers["X-Agent-Run-Id"] = this.agentContext.runId;
    }
    if (this.agentContext?.goal) {
      headers["X-Agent-Goal"] = this.agentContext.goal.slice(0, 500);
    }
    return headers;
  }

  // Helpers
  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private backoffDelay(attempt: number, retryAfter?: number): number {
    if (retryAfter) return Math.min(retryAfter * 1000, 60_000); // cap at 60s — prevent server-induced DoS
    if (this.backoff === "none") return 0;
    if (this.backoff === "linear") return attempt * 1000;
    // exponential: 1s, 2s, 4s ...
    return Math.min(2 ** (attempt - 1) * 1000, 30_000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private headersToObject(headers: Headers): Record<string, string> {
    return Object.fromEntries(headers.entries());
  }
}
