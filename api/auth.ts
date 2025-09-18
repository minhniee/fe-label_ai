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


