import { tokenStorage } from "./auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5000/api";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
  timestamp: string;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
};

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(
    path.startsWith("http") ? path : `${API_URL}${path.startsWith("/") ? path : `/${path}`}`
  );
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, auth = true, query } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = tokenStorage.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const errorPayload = payload as {
      error?: { message?: string; details?: unknown };
      message?: string;
    } | null;

    const message =
      errorPayload?.error?.message ||
      errorPayload?.message ||
      `Request failed (${response.status})`;

    if (response.status === 401 && typeof window !== "undefined") {
      tokenStorage.clear();
      if (!window.location.pathname.startsWith("/signin")) {
        window.location.href = "/signin";
      }
    }

    throw new ApiError(message, response.status, errorPayload?.error?.details);
  }

  const success = payload as ApiSuccess<T>;
  return success.data;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"], auth = true) =>
    apiRequest<T>(path, { method: "GET", query, auth }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    apiRequest<T>(path, { method: "POST", body, auth }),
  put: <T>(path: string, body?: unknown, auth = true) =>
    apiRequest<T>(path, { method: "PUT", body, auth }),
  delete: <T>(path: string, auth = true) =>
    apiRequest<T>(path, { method: "DELETE", auth }),
};
