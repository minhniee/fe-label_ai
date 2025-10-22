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

export interface Dataset {
  dataset_id: number
  name: string
  description?: string
  created_by_username: string
  created_at: string
  updated_at: string
}

export interface DatasetVersion {
  version_id: number
  dataset_id: number
  version_number: number
  changelog?: string
  created_at: string
  created_by: number
}

export interface DataFile {
  file_id: number
  version_id: number
  file_name: string
  file_path: string
  file_type?: string
  file_size?: number
  line_count?: number
  column_count?: number
  content?: string
  uploaded_by: number
  uploaded_at: string
}

export interface FilePreviewResponse {
  headers: string[]
  rows: string[][]
}

// Get all datasets
export async function getDatasets() {
  try {
    const response = await axios.get<Dataset[]>(`${API_BASE}/datasets`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get datasets'
    throw new Error(errorMessage)
  }
}

// Create dataset
export async function createDataset(name: string, description?: string) {
  try {
    const response = await axios.post<Dataset>(`${API_BASE}/datasets`, 
      { name, description: description || "" }, 
      {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      }
    )
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to create dataset'
    throw new Error(errorMessage)
  }
}

// Delete dataset
export async function deleteDataset(datasetId: number) {
  try {
    await axios.delete(`${API_BASE}/datasets/${datasetId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete dataset'
    throw new Error(errorMessage)
  }
}

// Create dataset version
export async function createDatasetVersion(datasetId: number, changelog?: string) {
  try {
    const response = await axios.post<DatasetVersion>(`${API_BASE}/datasets/${datasetId}/versions`, 
      { changelog: changelog || "Initial version" }, 
      {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      }
    )
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to create dataset version'
    throw new Error(errorMessage)
  }
}

// Get dataset versions
export async function getDatasetVersions(datasetId: number) {
  try {
    const response = await axios.get<DatasetVersion[]>(`${API_BASE}/datasets/${datasetId}/versions`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get dataset versions'
    throw new Error(errorMessage)
  }
}

// Upload file to version
export async function uploadFileToVersion(versionId: number, file: File, fileType: string = "text") {
  const form = new FormData()
  form.append("file", file)
  form.append("file_type", fileType)

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"
  let headers: Record<string, string> = {}
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (token) headers["Authorization"] = `Bearer ${token}`
  } catch {}

  try {
    const response = await axios.post(`${API_BASE}/datasets/versions/${versionId}/files`, form, {
      headers: {
        ...headers,
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data as DataFile
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || `Upload failed: ${error.response?.status}`
    throw new Error(errorMessage)
  }
}

// Get version files
export async function getVersionFiles(versionId: number) {
  try {
    const response = await axios.get<DataFile[]>(`${API_BASE}/datasets/versions/${versionId}/files`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get version files'
    throw new Error(errorMessage)
  }
}

// Get preview of a file's content (parsed rows/headers)
export async function getFilePreview(fileId: number) {
  try {
    const response = await axios.get<any>(`${API_BASE}/datasets/files/${fileId}/preview`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    const raw = response.data
    
    // If backend already returns headers/rows, pass through
    if (raw && Array.isArray(raw.headers) && Array.isArray(raw.rows)) {
      return { headers: raw.headers as string[], rows: raw.rows as string[][] } as FilePreviewResponse
    }

    // If backend returns preview_lines: string[] (first is header)
    if (raw && Array.isArray(raw.preview_lines) && raw.preview_lines.length > 0) {
      const parseCsvLine = (line: string): string[] => {
        const result: string[] = []
        let current = ""
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"'
              i++
            } else {
              inQuotes = !inQuotes
            }
          } else if (ch === ',' && !inQuotes) {
            result.push(current)
            current = ""
          } else {
            current += ch
          }
        }
        result.push(current)
        return result
      }

      const [headerLine, ...rowLines] = raw.preview_lines as string[]
      const headers = parseCsvLine(headerLine).map((h) => h.trim() || "column")
      const rows = rowLines.map((l) => parseCsvLine(l))
      return { headers, rows } as FilePreviewResponse
    }

    // Fallback empty
    return { headers: [], rows: [] } as FilePreviewResponse
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get file preview'
    throw new Error(errorMessage)
  }
}

// Get actual data from a dataset version
export async function getVersionData(datasetId: number, versionId: number) {
  try {
    const response = await axios.get<any>(`${API_BASE}/datasets/${datasetId}/versions/${versionId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get version data'
    throw new Error(errorMessage)
  }
}

// Get file data from a specific file
export async function getFileData(fileId: number) {
  try {
    const response = await axios.get<any>(`${API_BASE}/datasets/files/${fileId}/data`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    
    // Extract the data from the response structure
    if (response.data && response.data.success && response.data.file && response.data.file.data) {
      return response.data.file.data
    }
    
    throw new Error('Invalid response structure from file data endpoint')
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get file data'
    throw new Error(errorMessage)
  }
}