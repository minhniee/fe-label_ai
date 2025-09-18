export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface RequestOptions {
  method?: HttpMethod
  headers?: Record<string, string>
  body?: unknown
  auth?: boolean
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

function getAuthHeaders(enabled: boolean): Record<string, string> {
  if (!enabled) return {}
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

export async function apiRequest<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", headers = {}, body, auth = false } = options

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
    ...getAuthHeaders(auth),
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed: ${res.status}`)
  }

  const contentType = res.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    return (await res.json()) as T
  }
  return (await res.text()) as unknown as T
}


