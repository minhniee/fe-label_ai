import { apiRequest } from "./client"

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

// GET /batches/
export async function getBatches() {
  return apiRequest<BatchListResponse>("/batches/", { auth: true })
}

// POST /batches/
export async function createBatch(payload: CreateBatchRequest) {
  return apiRequest<BatchResponse>("/batches/", { method: "POST", body: payload, auth: true })
}

// GET /batches/{batch_id}
export async function getBatch(batchId: number) {
  return apiRequest<BatchResponse>(`/batches/${batchId}`, { auth: true })
}

// PUT /batches/{batch_id}
export async function updateBatch(batchId: number, payload: UpdateBatchRequest) {
  return apiRequest<BatchResponse>(`/batches/${batchId}`, { method: "PUT", body: payload, auth: true })
}

// DELETE /batches/{batch_id}
export async function deleteBatch(batchId: number) {
  return apiRequest<{ message: string }>(`/batches/${batchId}`, { method: "DELETE", auth: true })
}


