// Thin fetch wrapper for the Spring Boot API.
// - Always sends the JSESSIONID cookie (credentials: "include").
// - Turns the backend's two error shapes into one ApiError:
//     {"error": "Email already registered"}                 -> message
//     {"email": "Email must be valid", "password": "..."}   -> fieldErrors (from @Valid)

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: Json | FormData;
  signal?: AbortSignal;
}

// Lets the auth layer react when any call reports the session has ended.
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

const BASE = "/api";

async function parseError(res: Response): Promise<ApiError> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON body (e.g. a proxy error page)
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    if (typeof record.error === "string") {
      return new ApiError(res.status, record.error);
    }
    const fieldErrors: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string") fieldErrors[key] = value;
    }
    if (Object.keys(fieldErrors).length > 0) {
      return new ApiError(res.status, "Please fix the highlighted fields.", fieldErrors);
    }
  }

  if (res.status === 401) return new ApiError(401, "Please log in to continue");
  if (res.status === 403) return new ApiError(403, "You do not have permission to perform this action");
  if (res.status === 404) return new ApiError(404, "Not found");
  if (res.status >= 500) return new ApiError(res.status, "The server had a problem. Please try again.");
  return new ApiError(res.status, `Request failed (${res.status})`);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: "include",
      signal,
      headers: body !== undefined && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, "Can't reach the gym server. Check that the backend is running.");
  }

  if (!res.ok) {
    const error = await parseError(res);
    // Login failures are 401 too, but they are not an expired session
    if (res.status === 401 && !path.startsWith("/auth/login")) {
      unauthorizedListeners.forEach((listener) => listener());
    }
    throw error;
  }

  if (res.status === 204) return undefined as T;
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return (await res.json()) as T;
  return undefined as T;
}

/** Download a binary response (e.g. a medical clearance document). */
export async function requestBlob(path: string): Promise<Blob> {
  const res = await fetch(BASE + path, { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return res.blob();
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: Json | FormData) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: Json) => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** Best human-readable message for any thrown value. */
export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
