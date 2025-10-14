import { apiRequest } from "./client"

export interface RegisterPayload {
  username: string
  email: string
  password: string
  confirm_password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  user: any
}

export interface MeResponse {
  user_id: number
  username: string
  email: string
  role_id: number
  role_name: string
  created_at: string
}

export async function registerUser(payload: RegisterPayload) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: payload,
  })
}

export async function loginUser(username_or_email: string, password: string) {
  return apiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    body: { username_or_email, password },
  })
}

export function persistAuth(token: TokenResponse) {
  try {
    localStorage.setItem("access_token", token.access_token)
    if (token.refresh_token) localStorage.setItem("refresh_token", token.refresh_token)
    if (token.user) localStorage.setItem("user", JSON.stringify(token.user))
  } catch {}
}

export async function getMe() {
  return apiRequest<MeResponse>("/auth/me", { method: "GET", auth: true })
}

export async function logout() {
  try {
    await apiRequest("/auth/logout", { method: "POST", auth: true })
  } finally {
    try {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      localStorage.removeItem("user")
    } catch {}
  }
}


