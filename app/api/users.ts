import api from './client'

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
    const response = await api.get<User[]>(`/users/`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get users'
    throw new Error(errorMessage)
  }
}

export async function createUser(payload: CreateUserPayload) {
  try {
    const response = await api.post<User>(`/users/`, payload, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to create user'
    throw new Error(errorMessage)
  }
}

export async function updateUser(userId: number, payload: UpdateUserPayload) {
  try {
    const response = await api.put<User>(`/users/${userId}`, payload, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to update user'
    throw new Error(errorMessage)
  }
}

export async function deleteUser(userId: number) {
  try {
    await api.delete(`/users/${userId}`, {
    })
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete user'
    throw new Error(errorMessage)
  }
}

//HI from Gokul
