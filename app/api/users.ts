import { apiRequest } from "./client"

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
  return apiRequest<User[]>("/users/", { auth: true })
}

export async function createUser(payload: CreateUserPayload) {
  return apiRequest<User>("/users/", { method: "POST", body: payload, auth: true })
}

export async function updateUser(userId: number, payload: UpdateUserPayload) {
  return apiRequest<User>(`/users/${userId}`, { method: "PUT", body: payload, auth: true })
}

export async function deleteUser(userId: number) {
  return apiRequest<void>(`/users/${userId}`, { method: "DELETE", auth: true })
}


