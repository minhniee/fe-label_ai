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

export type BatchStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED"

export interface CreateBatchRequest {
  name: string
  description?: string
  dataset_id: number
  version_id: number
}

export interface UpdateBatchRequest {
  name?: string
  description?: string
  status?: BatchStatus
}

export interface BatchResponse {
  batch_id: number
  dataset_id: number
  version_id: number
  name: string
  description?: string | null
  status: BatchStatus
  progress_percentage: number
  total_files: number
  completed_files: number
  created_by: number
  creator_username?: string
  created_at: string
  updated_at: string
}

export interface BatchListResponse {
  batches: BatchResponse[]
  total: number
  page: number
  page_size: number
}

export interface BatchProgressResponse {
  batch_id: number
  batch_name: string
  status: string
  progress_percentage: number
  total_files: number
  completed_files: number
  assigned_users: string[]
  created_at: string
  updated_at: string
}

// GET /batches/
export async function getBatches() {
  try {
    const response = await axios.get<BatchListResponse>(`${API_BASE}/batches/`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get batches'
    throw new Error(errorMessage)
  }
}

// POST /batches/
export async function createBatch(payload: CreateBatchRequest) {
  try {
    const response = await axios.post<BatchResponse>(`${API_BASE}/batches/`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to create batch'
    throw new Error(errorMessage)
  }
}

// GET /batches/{batch_id}
export async function getBatch(batchId: number) {
  try {
    const response = await axios.get<BatchResponse>(`${API_BASE}/batches/${batchId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get batch'
    throw new Error(errorMessage)
  }
}

// PUT /batches/{batch_id}
export async function updateBatch(batchId: number, payload: UpdateBatchRequest) {
  try {
    const response = await axios.put<BatchResponse>(`${API_BASE}/batches/${batchId}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to update batch'
    throw new Error(errorMessage)
  }
}

// DELETE /batches/{batch_id}
export async function deleteBatch(batchId: number) {
  try {
    const response = await axios.delete<{ message: string }>(`${API_BASE}/batches/${batchId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete batch'
    throw new Error(errorMessage)
  }
}

// GET /batches/{batch_id}/progress
export async function getBatchProgress(batchId: number) {
  try {
    const response = await axios.get<BatchProgressResponse>(`${API_BASE}/batches/${batchId}/progress`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get batch progress'
    throw new Error(errorMessage)
  }
}


