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

export async function createLabel(data: CreateLabelRequest): Promise<CreateLabelResponse> {
  try {
    const response = await axios.post<CreateLabelResponse>(`${API_BASE}/labels/`, data, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to create label: ${error.response?.statusText || error.message}`)
    }
    throw new Error('Failed to create label: Unknown error')
  }
}

// GET /labels/ - Get all labels
export async function getAllLabels(): Promise<LabelResponse[]> {
  try {
    const response = await axios.get<LabelResponse[]>(`${API_BASE}/labels/`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get labels'
    throw new Error(errorMessage)
  }
}

// GET /labels/{label_id}
export async function getLabel(labelId: number): Promise<LabelResponse> {
  try {
    const response = await axios.get<LabelResponse>(`${API_BASE}/labels/${labelId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get label'
    throw new Error(errorMessage)
  }
}

// PUT /labels/{label_id}
export async function updateLabel(labelId: number, data: UpdateLabelRequest): Promise<LabelResponse> {
  try {
    const response = await axios.put<LabelResponse>(`${API_BASE}/labels/${labelId}`, data, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
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
    await axios.delete(`${API_BASE}/labels/${labelId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete label'
    throw new Error(errorMessage)
  }
}
