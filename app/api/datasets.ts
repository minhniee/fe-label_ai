import { apiRequest } from "./client"

export interface Dataset {
  dataset_id: number
  name: string
  description?: string
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
  return apiRequest<Dataset[]>("/datasets", { auth: true })
}

// Create dataset
export async function createDataset(name: string, description?: string) {
  return apiRequest<Dataset>("/datasets", {
    method: "POST",
    body: { name, description: description || "" },
    auth: true
  })
}

// Delete dataset
export async function deleteDataset(datasetId: number) {
  return apiRequest<void>(`/datasets/${datasetId}`, {
    method: "DELETE",
    auth: true
  })
}

// Create dataset version
export async function createDatasetVersion(datasetId: number, changelog?: string) {
  return apiRequest<DatasetVersion>(`/datasets/${datasetId}/versions`, {
    method: "POST",
    body: { changelog: changelog || "Initial version" },
    auth: true
  })
}

// Get dataset versions
export async function getDatasetVersions(datasetId: number) {
  return apiRequest<DatasetVersion[]>(`/datasets/${datasetId}/versions`, { auth: true })
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

  const res = await fetch(`${API_BASE}/datasets/versions/${versionId}/files`, {
    method: "POST",
    headers,
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Upload failed: ${res.status}`)
  }

  return await res.json() as DataFile
}

// Get version files
export async function getVersionFiles(versionId: number) {
  return apiRequest<DataFile[]>(`/datasets/versions/${versionId}/files`, { auth: true })
}

// Get preview of a file's content (parsed rows/headers)
export async function getFilePreview(fileId: number) {
  const raw = await apiRequest<any>(`/datasets/files/${fileId}/preview`, { auth: true })
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
}
