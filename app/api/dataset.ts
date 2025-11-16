import api from './client'

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

export interface DatasetHistoryResponse {
  version_id: number
  version_number: number
  changelog?: string
  created_at: string
  created_by: number
  file_count: number
}

export interface DatasetCompareResponse {
  version1_id: number
  version2_id: number
  differences: any
  summary: string
}

export interface VersionDataResponse {
  success: boolean
  data: any
  dataset_id: number
  version_id: number
  version_number: number
}

export interface VersionFilesResponse {
  success: boolean
  files: DataFile[]
  dataset_id: number
  version_id: number
  version_number: number
  file_count: number
}

export interface VersionCompleteResponse {
  success: boolean
  dataset: {
    dataset_id: number
    name: string
    description?: string
  }
  version: {
    version_id: number
    version_number: number
    changelog?: string
    created_at: string
  }
  files: DataFile[]
  data: any
  file_count: number
  data_count: number
}

export interface DatasetUpdateRequest {
  name?: string
  description?: string
}

// Get all datasets
export async function getDatasets() {
  try {
    const response = await api.get<Dataset[]>(`/datasets`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get datasets'
    throw new Error(errorMessage)
  }
}

// GET /datasets/{dataset_id}
export async function getDataset(datasetId: number): Promise<Dataset> {
  try {
    const response = await api.get<Dataset>(`/datasets/${datasetId}`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get dataset'
    throw new Error(errorMessage)
  }
}

// Create dataset
export async function createDataset(name: string, description?: string) {
  try {
    const response = await api.post<Dataset>(`/datasets`, 
      { name, description: description || "" }, 
      {
      }
    )
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to create dataset'
    throw new Error(errorMessage)
  }
}

// PUT /datasets/{dataset_id}
export async function updateDataset(datasetId: number, data: DatasetUpdateRequest): Promise<Dataset> {
  try {
    const response = await api.put<Dataset>(`/datasets/${datasetId}`, data, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to update dataset'
    throw new Error(errorMessage)
  }
}

// Delete dataset
export async function deleteDataset(datasetId: number) {
  try {
    await api.delete(`/datasets/${datasetId}`, {
    })
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete dataset'
    throw new Error(errorMessage)
  }
}

// Create dataset version
export async function createDatasetVersion(datasetId: number, changelog?: string) {
  try {
    const response = await api.post<DatasetVersion>(`/datasets/${datasetId}/versions`, 
      { changelog: changelog || "Initial version" }, 
      {
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
    const response = await api.get<DatasetVersion[]>(`/datasets/${datasetId}/versions`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get dataset versions'
    throw new Error(errorMessage)
  }
}

// GET /datasets/versions/{version_id}
export async function getVersion(versionId: number): Promise<DatasetVersion> {
  try {
    const response = await api.get<DatasetVersion>(`/datasets/versions/${versionId}`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get version'
    throw new Error(errorMessage)
  }
}

// Upload file to version
export async function uploadFileToVersion(versionId: number, file: File, fileType: string = "text") {
  const form = new FormData()
  form.append("file", file)
  form.append("file_type", fileType)

  try {
    const response = await api.post(`/datasets/versions/${versionId}/files`, form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data as DataFile
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || `Upload failed: ${error.response?.status}`
    throw new Error(errorMessage)
  }
}

// POST /datasets/{dataset_id}/upload
export async function uploadFileToDataset(datasetId: number, file: File, fileType: string = "text", changelog?: string): Promise<DataFile> {
  const form = new FormData()
  form.append("file", file)
  form.append("file_type", fileType)
  if (changelog) {
    form.append("changelog", changelog)
  }

  try {
    const response = await api.post(`/datasets/${datasetId}/upload`, form, {
      headers: {
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
    const response = await api.get<DataFile[]>(`/datasets/versions/${versionId}/files`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get version files'
    throw new Error(errorMessage)
  }
}

// GET /datasets/files/{file_id}
export async function getFile(fileId: number): Promise<DataFile> {
  try {
    const response = await api.get<DataFile>(`/datasets/files/${fileId}`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get file'
    throw new Error(errorMessage)
  }
}

// Get preview of a file's content (parsed rows/headers)
export async function getFilePreview(fileId: number, previewLines: number = 10): Promise<FilePreviewResponse> {
  try {
    const response = await api.get<any>(`/datasets/files/${fileId}/preview?preview_lines=${previewLines}`, {
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
    const response = await api.get<any>(`/datasets/${datasetId}/versions/${versionId}`, {
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
    const response = await api.get<any>(`/datasets/files/${fileId}/data`, {
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

// DELETE /datasets/files/{file_id}
export async function deleteFile(fileId: number): Promise<void> {
  try {
    await api.delete(`/datasets/files/${fileId}`, {
    })
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete file'
    throw new Error(errorMessage)
  }
}

// GET /datasets/{dataset_id}/history
export async function getDatasetHistory(datasetId: number): Promise<DatasetHistoryResponse[]> {
  try {
    const response = await api.get<DatasetHistoryResponse[]>(`/datasets/${datasetId}/history`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get dataset history'
    throw new Error(errorMessage)
  }
}

// GET /datasets/compare/{version1_id}/{version2_id}
export async function compareVersions(version1Id: number, version2Id: number): Promise<DatasetCompareResponse> {
  try {
    const response = await api.get<DatasetCompareResponse>(`/datasets/compare/${version1Id}/${version2Id}`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to compare versions'
    throw new Error(errorMessage)
  }
}

// GET /datasets/{dataset_id}/versions/{version_id}
export async function getDatasetVersionData(datasetId: number, versionId: number): Promise<VersionDataResponse> {
  try {
    const response = await api.get<VersionDataResponse>(`/datasets/${datasetId}/versions/${versionId}`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get version data'
    throw new Error(errorMessage)
  }
}

// GET /datasets/{dataset_id}/versions/{version_id}/files
export async function getVersionFilesByDataset(datasetId: number, versionId: number): Promise<VersionFilesResponse> {
  try {
    const response = await api.get<VersionFilesResponse>(`/datasets/${datasetId}/versions/${versionId}/files`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get version files'
    throw new Error(errorMessage)
  }
}
// GET /datasets/{dataset_id}/versions/{version_id}/complete
export async function getVersionCompleteInfo(datasetId: number, versionId: number): Promise<VersionCompleteResponse> {
  try {
    const response = await api.get<VersionCompleteResponse>(`/datasets/${datasetId}/versions/${versionId}/complete`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get version complete info'
    throw new Error(errorMessage)
  }
}
