import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true

// Helper function to get auth headers (keeping for backward compatibility)
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

export interface CreateBatchAssignmentRequest {
  batch_id: number
  user_id: number
  notes?: string
}

export interface UpdateBatchAssignmentRequest {
  notes?: string
  started_at?: string
  completed_at?: string
}

export interface BatchAssignmentResponse {
  assignment_id: number
  batch_id: number
  user_id: number
  notes?: string
  assigned_by: number
  assigner_username: string
  user_username: string
  assigned_at: string
  started_at?: string
  completed_at?: string
}

export interface BatchAssignmentListResponse {
  assignments: BatchAssignmentResponse[]
  total: number
  page: number
  page_size: number
}

export interface BatchStatsResponse {
  total_batches: number
  pending_batches: number
  in_progress_batches: number
  completed_batches: number
  blocked_batches: number
  overall_progress: number
  total_files: number
  completed_files: number
}

export interface BatchDashboardResponse {
  stats: BatchStatsResponse
  recent_batches: BatchProgressResponse[]
  user_assignments: BatchAssignmentResponse[]
  overdue_batches: BatchProgressResponse[]
}

export interface BatchConfig {
  name: string
  description?: string
  file_ids?: number[]
}

export interface BulkCreateBatchesRequest {
  dataset_id: number
  version_id: number
  batch_configs: BatchConfig[]
}

export interface BulkCreateBatchesResponse {
  message: string
  batches: BatchResponse[]
}

export interface BulkAssignBatchesRequest {
  batch_ids: number[]
  user_ids: number[]
  notes?: string
}

export interface BulkAssignBatchesResponse {
  message: string
  assignments: BatchAssignmentResponse[]
}

export interface BatchFilterRequest {
  dataset_id?: number
  version_id?: number
  status?: BatchStatus
  created_by?: number
  search?: string
  page?: number
  page_size?: number
}

export interface BatchAssignmentFilterRequest {
  batch_id?: number
  user_id?: number
  assigned_by?: number
  page?: number
  page_size?: number
}

export interface UserBatchProgressResponse {
  user_id: number
  username: string
  assigned_batches: number
  completed_batches: number
  in_progress_batches: number
  total_progress: number
  recent_activity: BatchAssignmentResponse[]
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

// POST /batches/assignments/
export async function createBatchAssignment(request: CreateBatchAssignmentRequest) {
  try {
    const response = await axios.post<BatchAssignmentResponse>(`${API_BASE}/batches/assignments/`, request, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to create batch assignment'
    throw new Error(errorMessage)
  }
}

// GET /batches/assignments/
export async function getBatchAssignments(filters?: {
  batch_id?: number
  user_id?: number
  assigned_by?: number
  page?: number
  page_size?: number
}) {
  try {
    const params = new URLSearchParams()
    if (filters?.batch_id) params.append('batch_id', filters.batch_id.toString())
    if (filters?.user_id) params.append('user_id', filters.user_id.toString())
    if (filters?.assigned_by) params.append('assigned_by', filters.assigned_by.toString())
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.page_size) params.append('page_size', filters.page_size.toString())

    const url = params.toString() 
      ? `${API_BASE}/batches/assignments/?${params.toString()}`
      : `${API_BASE}/batches/assignments/`
    const response = await axios.get<BatchAssignmentListResponse>(url, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get batch assignments'
    throw new Error(errorMessage)
  }
}

// PUT /batches/assignments/{assignment_id}
export async function updateBatchAssignment(assignmentId: number, request: UpdateBatchAssignmentRequest) {
  try {
    const response = await axios.put<BatchAssignmentResponse>(
      `${API_BASE}/batches/assignments/${assignmentId}`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      }
    )
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to update batch assignment'
    throw new Error(errorMessage)
  }
}

// DELETE /batches/assignments/{assignment_id}
export async function deleteBatchAssignment(assignmentId: number) {
  try {
    const response = await axios.delete<{ message: string }>(
      `${API_BASE}/batches/assignments/${assignmentId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      }
    )
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete batch assignment'
    throw new Error(errorMessage)
  }
}

// GET /batches/stats/
export async function getBatchStats(datasetId?: number) {
  try {
    const params = new URLSearchParams()
    if (datasetId) params.append('dataset_id', datasetId.toString())
    
    const url = params.toString() 
      ? `${API_BASE}/batches/stats/?${params.toString()}`
      : `${API_BASE}/batches/stats/`
      
    const response = await axios.get<BatchStatsResponse>(url, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get batch stats'
    throw new Error(errorMessage)
  }
}

// GET /batches/dashboard/
export async function getBatchDashboard() {
  try {
    const response = await axios.get<BatchDashboardResponse>(`${API_BASE}/batches/dashboard/`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get batch dashboard'
    throw new Error(errorMessage)
  }
}

// POST /batches/bulk/create
export async function bulkCreateBatches(request: BulkCreateBatchesRequest) {
  try {
    const response = await axios.post<BulkCreateBatchesResponse>(`${API_BASE}/batches/bulk/create`, request, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to bulk create batches'
    throw new Error(errorMessage)
  }
}

// POST /batches/bulk/assign
export async function bulkAssignBatches(request: BulkAssignBatchesRequest) {
  try {
    const response = await axios.post<BulkAssignBatchesResponse>(`${API_BASE}/batches/bulk/assign`, request, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to bulk assign batches'
    throw new Error(errorMessage)
  }
}

// GET /batches/datasets/{dataset_id}/batches
export async function getDatasetBatches(datasetId: number, filters?: Omit<BatchFilterRequest, 'dataset_id'>) {
  try {
    const params = new URLSearchParams()
    if (filters?.version_id) params.append('version_id', filters.version_id.toString())
    if (filters?.status) params.append('status', filters.status)
    if (filters?.created_by) params.append('created_by', filters.created_by.toString())
    if (filters?.search) params.append('search', filters.search)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.page_size) params.append('page_size', filters.page_size.toString())
    
    const url = params.toString() 
      ? `${API_BASE}/batches/datasets/${datasetId}/batches?${params.toString()}`
      : `${API_BASE}/batches/datasets/${datasetId}/batches`
      
    const response = await axios.get<BatchListResponse>(url, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get dataset batches'
    throw new Error(errorMessage)
  }
}

// GET /batches/datasets/{dataset_id}/stats
export async function getDatasetBatchStats(datasetId: number) {
  try {
    const response = await axios.get<BatchStatsResponse>(`${API_BASE}/batches/datasets/${datasetId}/stats`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get dataset batch stats'
    throw new Error(errorMessage)
  }
}

// GET /batches/users/{user_id}/assignments
export async function getUserAssignments(userId: number, filters?: Omit<BatchAssignmentFilterRequest, 'user_id'>) {
  try {
    const params = new URLSearchParams()
    if (filters?.batch_id) params.append('batch_id', filters.batch_id.toString())
    if (filters?.assigned_by) params.append('assigned_by', filters.assigned_by.toString())
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.page_size) params.append('page_size', filters.page_size.toString())
    
    const url = params.toString() 
      ? `${API_BASE}/batches/users/${userId}/assignments?${params.toString()}`
      : `${API_BASE}/batches/users/${userId}/assignments`
      
    const response = await axios.get<BatchAssignmentListResponse>(url, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get user assignments'
    throw new Error(errorMessage)
  }
}

// GET /batches/users/{user_id}/progress
export async function getUserBatchProgress(userId: number) {
  try {
    const response = await axios.get<UserBatchProgressResponse>(`${API_BASE}/batches/users/${userId}/progress`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get user batch progress'
    throw new Error(errorMessage)
  }
}


