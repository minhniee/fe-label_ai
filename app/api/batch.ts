import api from './client'

export type BatchStatus = "pending" | "in_progress" | "completed" | "blocked"

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
  batch_metadata?: {
    file_ids?: number[]
    assigned_pending_emails?: string[]
    [key: string]: any
  }
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
  batch_metadata?: {
    file_ids?: number[]
    [key: string]: any
  }
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

// =============================================
// PROJECT-BASED BATCH TYPES
// =============================================

export interface SplitFileRequest {
  project_id: number
  file_id: number
  chunk_size?: number
  auto_create_batches?: boolean
}

export interface ChunkMetadata {
  chunk_number: number
  start_row: number
  end_row: number
  row_count: number
  file_id?: number
  file_name?: string
  storage_key?: string
}

export interface SplitFileResponse {
  success: boolean
  project_id: number
  original_file_id: number
  original_filename: string
  total_rows: number
  total_chunks: number
  chunk_size: number
  chunks_created: ChunkMetadata[]
  batches_created?: number[]
}

export interface CreateProjectBatchRequest {
  project_id: number
  name: string
  description?: string
  file_ids: number[]
  batch_metadata?: Record<string, any>
}

export interface CreateProjectBatchResponse {
  batch_id: number
  project_id: number
  name: string
  description?: string
  status: string
  total_files: number
  created_at: string
}

export interface AssignBatchToUsersRequest {
  batch_id: number
  user_ids: number[]
  notes?: string
}

export interface AssignBatchToUsersResponse {
  batch_id: number
  batch_name: string
  assignments_created: number
  assignments: BatchAssignmentResponse[]
}

export interface DistributeFileRequest {
  project_id: number
  file_id: number
  chunk_size?: number // Optional - API will auto-calculate if not provided
  user_ids: number[]
  distribution_method?: 'round_robin' | 'first_takes_remainder'
  notes?: string
}

export interface UserDistribution {
  user_id: number
  username: string
  assigned_batches: number
  batch_ids: number[]
}

export interface DistributeFileResponse {
  project_id: number
  file_id: number
  total_rows: number
  chunk_size: number
  total_chunks: number
  batches_created: number
  distribution_method: string
  user_distribution: UserDistribution[]
}

export interface ProjectBatchStatsResponse {
  project_id: number
  project_name: string
  total_batches: number
  pending_batches: number
  in_progress_batches: number
  completed_batches: number
  overall_progress: number
  assigned_users: number
}

// GET /batches/
export async function getBatches() {
  try {
    const response = await api.get<BatchListResponse>(`/batches/`, {
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
    const response = await api.post<BatchResponse>(`/batches/`, payload, {
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
    const response = await api.get<BatchResponse>(`/batches/${batchId}`, {
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
    const response = await api.put<BatchResponse>(`/batches/${batchId}`, payload, {
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
    const response = await api.delete<{ message: string }>(`/batches/${batchId}`, {
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
    const response = await api.get<BatchProgressResponse>(`/batches/${batchId}/progress`, {
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
    const response = await api.post<BatchAssignmentResponse>(`/batches/assignments/`, request, {
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
      ? `/batches/assignments/?${params.toString()}`
      : `/batches/assignments/`
    const response = await api.get<BatchAssignmentListResponse>(url, {
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
    const response = await api.put<BatchAssignmentResponse>(
      `/batches/assignments/${assignmentId}`,
      request,
      {
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
    const response = await api.delete<{ message: string }>(
      `/batches/assignments/${assignmentId}`,
      {
      }
    )
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete batch assignment'
    throw new Error(errorMessage)
  }
}

// GET /batches/stats/
export async function getBatchStats(filters?: {
  dataset_id?: number
  start_date?: string
  end_date?: string
  time_period?: '7d' | '30d' | '3m'
}) {
  try {
    const params = new URLSearchParams()
    if (filters?.dataset_id) params.append('dataset_id', filters.dataset_id.toString())
    if (filters?.start_date) params.append('start_date', filters.start_date)
    if (filters?.end_date) params.append('end_date', filters.end_date)
    if (filters?.time_period) params.append('time_period', filters.time_period)
    
    const url = params.toString() 
      ? `/batches/stats/?${params.toString()}`
      : `/batches/stats/`
      
    const response = await api.get<BatchStatsResponse>(url, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get batch stats'
    throw new Error(errorMessage)
  }
}

// GET /batches/dashboard/
export async function getBatchDashboard(filters?: {
  start_date?: string
  end_date?: string
  time_period?: '7d' | '30d' | '3m'
}) {
  try {
    const params = new URLSearchParams()
    if (filters?.start_date) params.append('start_date', filters.start_date)
    if (filters?.end_date) params.append('end_date', filters.end_date)
    if (filters?.time_period) params.append('time_period', filters.time_period)
    
    const url = params.toString() 
      ? `/batches/dashboard/?${params.toString()}`
      : `/batches/dashboard/`
      
    const response = await api.get<BatchDashboardResponse>(url, {
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
    const response = await api.post<BulkCreateBatchesResponse>(`/batches/bulk/create`, request, {
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
    const response = await api.post<BulkAssignBatchesResponse>(`/batches/bulk/assign`, request, {
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
      ? `/batches/datasets/${datasetId}/batches?${params.toString()}`
      : `/batches/datasets/${datasetId}/batches`
      
    const response = await api.get<BatchListResponse>(url, {
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
    const response = await api.get<BatchStatsResponse>(`/batches/datasets/${datasetId}/stats`, {
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
      ? `/batches/users/${userId}/assignments?${params.toString()}`
      : `/batches/users/${userId}/assignments`
      
    const response = await api.get<BatchAssignmentListResponse>(url, {
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
    const response = await api.get<UserBatchProgressResponse>(`/batches/users/${userId}/progress`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get user batch progress'
    throw new Error(errorMessage)
  }
}

// POST /batches/{batch_id}/progress
export async function updateBatchProgress(batchId: number) {
  try {
    const response = await api.post<BatchProgressResponse>(
      `/batches/${batchId}/progress`,
      {},
      {
      }
    )
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to update batch progress'
    throw new Error(errorMessage)
  }
}

// POST /batches/{batch_id}/complete
export async function completeBatch(batchId: number) {
  try {
    const response = await api.post<BatchResponse>(
      `/batches/${batchId}/complete`,
      {},
      {
      }
    )
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to complete batch'
    throw new Error(errorMessage)
  }
}

// =============================================
// PROJECT-BASED BATCH ENDPOINTS
// =============================================

// POST /batches/projects/split-file
export async function splitProjectFile(request: SplitFileRequest) {
  try {
    const response = await api.post<SplitFileResponse>(
      `/batches/projects/split-file`,
      request,
      {
      }
    )
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to split project file'
    throw new Error(errorMessage)
  }
}

// POST /batches/projects/create-batch
export async function createProjectBatch(request: CreateProjectBatchRequest) {
  try {
    const response = await api.post<CreateProjectBatchResponse>(
      `/batches/projects/create-batch`,
      request,
      {
      }
    )
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to create project batch'
    throw new Error(errorMessage)
  }
}

// POST /batches/projects/assign-batch
export async function assignBatchToUsers(request: AssignBatchToUsersRequest) {
  try {
    const response = await api.post<AssignBatchToUsersResponse>(
      `/batches/projects/assign-batch`,
      request,
      {
      }
    )
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to assign batch to users'
    throw new Error(errorMessage)
  }
}

// POST /batches/projects/distribute-file
export async function distributeFileToUsers(request: DistributeFileRequest) {
  try {
    const response = await api.post<DistributeFileResponse>(
      `/batches/projects/distribute-file`,
      request,
      {
      }
    )
    return response.data
  } catch (error: any) {
    const rawDetail = error.response?.data?.detail
    let errorMessage = error.message || 'Failed to distribute file to users'
    if (rawDetail) {
      if (typeof rawDetail === 'string') {
        errorMessage = rawDetail
      } else {
        try {
          errorMessage = JSON.stringify(rawDetail)
        } catch {
          errorMessage = 'Failed to distribute file to users (invalid request payload)'
        }
      }
    }
    throw new Error(errorMessage)
  }
}

// GET /batches/projects/{project_id}/stats
export async function getProjectBatchStats(projectId: number, filters?: {
  start_date?: string
  end_date?: string
  time_period?: '7d' | '30d' | '3m'
}) {
  try {
    const params = new URLSearchParams()
    if (filters?.start_date) params.append('start_date', filters.start_date)
    if (filters?.end_date) params.append('end_date', filters.end_date)
    if (filters?.time_period) params.append('time_period', filters.time_period)
    
    const url = params.toString() 
      ? `/batches/projects/${projectId}/stats?${params.toString()}`
      : `/batches/projects/${projectId}/stats`
      
    const response = await api.get<ProjectBatchStatsResponse>(url, {
      }
    )
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get project batch stats'
    throw new Error(errorMessage)
  }
}

// GET /batches/projects/{project_id}/batches
export async function getProjectBatches(projectId: number, filters?: Omit<BatchFilterRequest, 'dataset_id'>) {
  try {
    const params = new URLSearchParams()
    if (filters?.version_id) params.append('version_id', filters.version_id.toString())
    if (filters?.status) params.append('status', filters.status)
    if (filters?.created_by) params.append('created_by', filters.created_by.toString())
    if (filters?.search) params.append('search', filters.search)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.page_size) params.append('page_size', filters.page_size.toString())
    
    const url = params.toString() 
      ? `/batches/projects/${projectId}/batches?${params.toString()}`
      : `/batches/projects/${projectId}/batches`
      
    const response = await api.get<BatchListResponse>(url, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get project batches'
    throw new Error(errorMessage)
  }
}
