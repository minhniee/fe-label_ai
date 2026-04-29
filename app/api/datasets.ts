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
    // Return mock data directly for the disabled authentication environment
    return [
      {
        dataset_id: 1,
        name: "Customer Feedback 2024",
        description: "Annual customer satisfaction survey results",
        created_by_username: "MockAdmin",
        created_at: "2024-01-10T10:00:00Z",
        updated_at: "2024-01-10T10:00:00Z",
      },
      {
        dataset_id: 2,
        name: "E-commerce Product Catalog",
        description: "List of products and their current pricing",
        created_by_username: "MockAdmin",
        created_at: "2024-02-15T14:30:00Z",
        updated_at: "2024-02-15T14:30:00Z",
      }
    ];
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
    return [
      {
        version_id: 1,
        dataset_id: datasetId,
        version_number: 1,
        changelog: "Initial version",
        created_at: "2024-01-01T12:00:00Z",
        created_by: 1
      }
    ];
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
    return [
      {
        file_id: 1,
        version_id: versionId,
        file_name: "data.csv",
        file_path: "/mock/data.csv",
        file_type: "csv",
        line_count: 100,
        column_count: 5,
        uploaded_by: 1,
        uploaded_at: "2024-01-01T12:00:00Z"
      }
    ];
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get version files'
    throw new Error(errorMessage)
  }
}

// Get preview of a file's content (parsed rows/headers)
export async function getFilePreview(fileId: number): Promise<FilePreviewResponse> {
  try {
    return {
      headers: ["id", "text", "label", "date", "source"],
      rows: [
        ["1", "Service was great", "positive", "2024-01-10", "Survey"],
        ["2", "Shipping was slow", "negative", "2024-01-11", "Review"],
        ["3", "Average product", "neutral", "2024-01-12", "Email"]
      ]
    };
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