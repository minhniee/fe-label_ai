import api from './client'

export interface CreateLabelRequest {
  name: string
  description: string
  color: string
  guidelines: string
  hotkey: string
  priority: number
  dataset_id: number
}

export interface CreateLabelResponse {
  name: string
  description: string
  color: string
  guidelines: string
  hotkey: string
  priority: number
  label_id: number
  dataset_id: number
  created_at: string
  created_by: number
  creator_username: string
}

export interface UpdateLabelRequest {
  name?: string
  description?: string
  color?: string
  guidelines?: string
  hotkey?: string
  priority?: number
}

export interface LabelResponse {
  name: string
  description: string
  color: string
  guidelines: string
  hotkey: string
  priority: number
  label_id: number
  dataset_id: number
  created_at: string
  created_by: number
  creator_username: string
}

export interface GetAllLabelsResponse {
  labels: LabelResponse[]
  total: number
  dataset_id: number
  dataset_name: string
}

export interface GetLabelsByDatasetResponse {
  labels: LabelResponse[]
  total: number
  dataset_id: number
  dataset_name: string
}

export interface SearchLabelsRequest {
  dataset_id?: number
  name_contains?: string
  color?: string
  priority_min?: number
  priority_max?: number
  created_after?: string
  created_before?: string
  has_annotations?: boolean
  limit?: number
  offset?: number
}

export interface SearchLabelsResponse {
  labels: LabelResponse[]
  total: number
  dataset_id?: number
  dataset_name?: string
}

export interface LabelStatsResponse {
  label_id: number
  label_name: string
  total_annotations: number
  last_used?: string
  usage_percentage: number
}

export interface LabelBase {
  name: string
  description?: string
  color?: string
  guidelines?: string
  hotkey?: string
  priority?: number
}

export interface BulkCreateLabelsRequest {
  dataset_id: number
  labels: LabelBase[]
}

export interface LabelValidationResponse {
  is_valid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

export interface LabelSummary {
  label_id: number
  name: string
  color?: string
  annotation_count: number
  last_used?: string
  priority: number
}

export interface DatasetLabelsOverview {
  dataset_id: number
  dataset_name: string
  total_labels: number
  labels: LabelSummary[]
  color_distribution: Record<string, number>
  priority_distribution: Record<string, number>
}

// export async function createLabel(data: CreateLabelRequest): Promise<CreateLabelResponse> {
//   try {
//     const response = await api.post<CreateLabelResponse>(`/labels/`, data, {
//     })
//     return response.data
//   } catch (error: any) {
//     if (axios.isAxiosError(error)) {
//       throw new Error(`Failed to create label: ${error.response?.statusText || error.message}`)
//     }
//     throw new Error('Failed to create label: Unknown error')
//   }
// }

// GET /labels/ - Get all labels
export async function getAllLabels(): Promise<LabelResponse[]> {
  try {
    const response = await api.get<GetAllLabelsResponse>(`/labels/`, {
    })
    return response.data.labels
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get labels'
    throw new Error(errorMessage)
  }
}

// GET /labels/{label_id}
export async function getLabel(labelId: number): Promise<LabelResponse> {
  try {
    const response = await api.get<LabelResponse>(`/labels/${labelId}`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get label'
    throw new Error(errorMessage)
  }
}

// GET /labels/dataset/{dataset_id}
export async function getLabelsByDataset(datasetId: number): Promise<GetLabelsByDatasetResponse> {
  try {
    const response = await api.get<GetLabelsByDatasetResponse>(`/labels/dataset/${datasetId}`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get labels by dataset'
    throw new Error(errorMessage)
  }
}

// POST /labels/search
export async function searchLabels(filters: SearchLabelsRequest): Promise<SearchLabelsResponse> {
  try {
    const response = await api.post<SearchLabelsResponse>(`/labels/search`, filters, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to search labels'
    throw new Error(errorMessage)
  }
}

// GET /labels/dataset/{dataset_id}/statistics
export async function getLabelStatistics(datasetId: number): Promise<LabelStatsResponse[]> {
  try {
    const response = await api.get<LabelStatsResponse[]>(`/labels/dataset/${datasetId}/statistics`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get label statistics'
    throw new Error(errorMessage)
  }
}

// POST /labels/bulk
export async function bulkCreateLabels(request: BulkCreateLabelsRequest): Promise<LabelResponse[]> {
  try {
    const response = await api.post<LabelResponse[]>(`/labels/bulk`, request, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to bulk create labels'
    throw new Error(errorMessage)
  }
}

// POST /labels/validate
export async function validateLabel(data: CreateLabelRequest): Promise<LabelValidationResponse> {
  try {
    const response = await api.post<LabelValidationResponse>(`/labels/validate`, data, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to validate label'
    throw new Error(errorMessage)
  }
}

// GET /labels/dataset/{dataset_id}/overview
export async function getDatasetLabelsOverview(datasetId: number): Promise<DatasetLabelsOverview> {
  try {
    const response = await api.get<DatasetLabelsOverview>(`/labels/dataset/${datasetId}/overview`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get dataset labels overview'
    throw new Error(errorMessage)
  }
}

// PUT /labels/{label_id}
export async function updateLabel(labelId: number, data: UpdateLabelRequest): Promise<LabelResponse> {
  try {
    const response = await api.put<LabelResponse>(`/labels/${labelId}`, data, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to update label'
    throw new Error(errorMessage)
  }
}

// DELETE /labels/{label_id}
export async function deleteLabel(labelId: number): Promise<void> {
  try {
    await api.delete(`/labels/${labelId}`, {
    })
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete label'
    throw new Error(errorMessage)
  }
}
