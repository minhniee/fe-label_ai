import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
  } catch {}
  return headers
}

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
  try {
    const response = await axios.post(`${API_BASE}/auth/register`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Registration failed'
    throw new Error(errorMessage)
  }
}

export async function loginUser(username_or_email: string, password: string) {
  try {
    const response = await axios.post<TokenResponse>(`${API_BASE}/auth/login`, 
      { username_or_email, password }, 
      {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      }
    )
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Login failed'
    throw new Error(errorMessage)
  }
}

export function persistAuth(token: TokenResponse) {
  // No longer needed - tokens are stored in HTTP-only cookies
  // Keep this function for backward compatibility but don't store in localStorage
  try {
    if (token.user) localStorage.setItem("user", JSON.stringify(token.user))
  } catch {}
}

export async function getMe() {
  try {
    const response = await axios.get<MeResponse>(`${API_BASE}/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get user info'
    throw new Error(errorMessage)
  }
}

export async function logout() {
  try {
    await axios.post(`${API_BASE}/auth/logout`, {}, {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    })
  } catch (error) {
    // Continue with cleanup even if logout request fails
  } finally {
    try {
      // Clear user data from localStorage (tokens are cleared by server cookies)
      localStorage.removeItem("user")
      localStorage.removeItem("user_picture")
      localStorage.removeItem("user_name")
      localStorage.removeItem("user_email")
    } catch {}
  }
}


