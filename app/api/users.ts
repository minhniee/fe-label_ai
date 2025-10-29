import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

// Helper function to get auth headers
const getAuthHeaders = () => {
  const headers: Record<string, string> = {}
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
  } catch {}
  return headers
}

export interface User {
  user_id: number
  username: string
  email: string
  role_id: number
  role_name?: string
  created_at?: string
}

export interface CreateUserPayload {
  username: string
  email: string
  password: string
  role_id: number
}

export interface UpdateUserPayload {
  username?: string
  email?: string
  role_id?: number
}

export async function getUsers() {
  try {
    const response = await axios.get<User[]>(`${API_BASE}/users/`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get users'
    throw new Error(errorMessage)
  }
}

export async function createUser(payload: CreateUserPayload) {
  try {
    const response = await axios.post<User>(`${API_BASE}/users/`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to create user'
    throw new Error(errorMessage)
  }
}

export async function updateUser(userId: number, payload: UpdateUserPayload) {
  try {
    const response = await axios.put<User>(`${API_BASE}/users/${userId}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to update user'
    throw new Error(errorMessage)
  }
}

export async function deleteUser(userId: number) {
  try {
    await axios.delete(`${API_BASE}/users/${userId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete user'
    throw new Error(errorMessage)
  }
}


