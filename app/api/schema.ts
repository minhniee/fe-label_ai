import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true

// Helper function to get auth headers (kept for backward compatibility)
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

// Types (aligned to backend schemas.schema_schemas)
export interface SchemaCreateRequest {
  name: string
  schema_definition: any
  description?: string
}

export interface SchemaUpdateRequest {
  name?: string
  schema_definition?: any
  description?: string
}

export interface SchemaResponse {
  schema_id: number
  dataset_id: number
  name: string
  schema_definition: any
  description?: string
  created_by?: number
  created_at: string
  updated_at?: string
}

// Optional types for ontology-related endpoints
export type OntologyStructure = any

export interface OntologyValidationResponse {
  valid: boolean
  errors?: string[]
  warnings?: string[]
}

export interface SchemaCompareResponse {
  left_schema_id: number
  right_schema_id: number
  differences: any
}

export interface SchemaHistoryResponse {
  version: number
  created_at: string
  created_by: number
  changes?: string
}

export interface SchemaVersionResponse {
  schema_id: number
  version: number
  schema_definition: any
  created_at: string
  created_by: number
  changes?: string
}

export interface SchemaFileResponse {
  file_id: number
  schema_id: number
  file_name: string
  file_type: string
  uploaded_by: number
  uploaded_at: string
  file_path?: string
}

// POST /schemas/ (dataset_id in query)
export async function createSchema(datasetId: number, data: SchemaCreateRequest): Promise<SchemaResponse> {
  try {
    const response = await axios.post<SchemaResponse>(
      `${API_BASE}/schemas/?dataset_id=${encodeURIComponent(datasetId)}`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      }
    )
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to create schema'
    throw new Error(errorMessage)
  }
}

// GET /schemas/ (optional dataset_id filter)
export async function getSchemas(datasetId?: number): Promise<SchemaResponse[]> {
  try {
    const url = typeof datasetId === 'number'
      ? `${API_BASE}/schemas/?dataset_id=${encodeURIComponent(datasetId)}`
      : `${API_BASE}/schemas/`

    const response = await axios.get<SchemaResponse[]>(url, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get schemas'
    throw new Error(errorMessage)
  }
}

// GET /schemas/{schema_id}
export async function getSchema(schemaId: number): Promise<SchemaResponse> {
  try {
    const response = await axios.get<SchemaResponse>(`${API_BASE}/schemas/${schemaId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get schema'
    throw new Error(errorMessage)
  }
}

// PUT /schemas/{schema_id}
export async function updateSchema(schemaId: number, data: SchemaUpdateRequest): Promise<SchemaResponse> {
  try {
    const response = await axios.put<SchemaResponse>(`${API_BASE}/schemas/${schemaId}`, data, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to update schema'
    throw new Error(errorMessage)
  }
}

// DELETE /schemas/{schema_id}
export async function deleteSchema(schemaId: number): Promise<void> {
  try {
    await axios.delete(`${API_BASE}/schemas/${schemaId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete schema'
    throw new Error(errorMessage)
  }
}

// GET /schemas/dataset/{dataset_id}
export async function getSchemasByDataset(datasetId: number): Promise<SchemaResponse[]> {
  try {
    const response = await axios.get<SchemaResponse[]>(`${API_BASE}/schemas/dataset/${datasetId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get schemas by dataset'
    throw new Error(errorMessage)
  }
}

// GET /schemas/{schema_id}/ontology
export async function getOntology(schemaId: number): Promise<OntologyStructure> {
  try {
    const response = await axios.get<OntologyStructure>(`${API_BASE}/schemas/${schemaId}/ontology`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get ontology'
    throw new Error(errorMessage)
  }
}

// PUT /schemas/{schema_id}/ontology
export async function updateOntology(schemaId: number, ontology: OntologyStructure): Promise<SchemaResponse> {
  try {
    const response = await axios.put<SchemaResponse>(`${API_BASE}/schemas/${schemaId}/ontology`, ontology, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to update ontology'
    throw new Error(errorMessage)
  }
}

// POST /schemas/validate
export async function validateOntology(ontology: OntologyStructure): Promise<OntologyValidationResponse> {
  try {
    const response = await axios.post<OntologyValidationResponse>(`${API_BASE}/schemas/validate`, ontology, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to validate ontology'
    throw new Error(errorMessage)
  }
}

// GET /schemas/{schema_id}/compare/{other_schema_id}
export async function compareSchemas(schemaId: number, otherSchemaId: number): Promise<SchemaCompareResponse> {
  try {
    const response = await axios.get<SchemaCompareResponse>(`${API_BASE}/schemas/${schemaId}/compare/${otherSchemaId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to compare schemas'
    throw new Error(errorMessage)
  }
}

// GET /schemas/{schema_id}/versions
export async function getSchemaVersions(schemaId: number): Promise<SchemaHistoryResponse[]> {
  try {
    const response = await axios.get<SchemaHistoryResponse[]>(`${API_BASE}/schemas/${schemaId}/versions`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get schema versions'
    throw new Error(errorMessage)
  }
}

// POST /schemas/{schema_id}/versions
export async function createSchemaVersion(schemaId: number, newDefinition: OntologyStructure, changes?: string): Promise<SchemaResponse> {
  try {
    const payload: any = { ...newDefinition }
    // Backend expects body as OntologyStructure, and optional `changes` as query or body field.
    // Router shows `changes` is a query parameter (Form arg), but we pass as body alongside definition if supported.
    const url = typeof changes === 'string' && changes.length > 0
      ? `${API_BASE}/schemas/${schemaId}/versions?changes=${encodeURIComponent(changes)}`
      : `${API_BASE}/schemas/${schemaId}/versions`

    const response = await axios.post<SchemaResponse>(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to create schema version'
    throw new Error(errorMessage)
  }
}

// GET /schemas/{schema_id}/versions/{version}
export async function getSchemaVersion(schemaId: number, version: number): Promise<SchemaVersionResponse> {
  try {
    const response = await axios.get<SchemaVersionResponse>(`${API_BASE}/schemas/${schemaId}/versions/${version}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get schema version'
    throw new Error(errorMessage)
  }
}

// POST /schemas/{schema_id}/files (multipart)
export async function uploadSchemaFile(schemaId: number, file: File, fileType: string = "json"): Promise<SchemaFileResponse> {
  const form = new FormData()
  form.append("file", file)
  form.append("file_type", fileType)

  try {
    const response = await axios.post<SchemaFileResponse>(`${API_BASE}/schemas/${schemaId}/files`, form, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to upload schema file'
    throw new Error(errorMessage)
  }
}

// GET /schemas/{schema_id}/files
export async function getSchemaFiles(schemaId: number): Promise<SchemaFileResponse[]> {
  try {
    const response = await axios.get<SchemaFileResponse[]>(`${API_BASE}/schemas/${schemaId}/files`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get schema files'
    throw new Error(errorMessage)
  }
}

// GET /schemas/files/{file_id}
export async function getSchemaFile(fileId: number): Promise<SchemaFileResponse> {
  try {
    const response = await axios.get<SchemaFileResponse>(`${API_BASE}/schemas/files/${fileId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get schema file'
    throw new Error(errorMessage)
  }
}

// DELETE /schemas/files/{file_id}
export async function deleteSchemaFile(fileId: number): Promise<void> {
  try {
    await axios.delete(`${API_BASE}/schemas/files/${fileId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete schema file'
    throw new Error(errorMessage)
  }
}

// GET /schemas/search
export async function searchSchemas(query: string, datasetId?: number): Promise<SchemaResponse[]> {
  try {
    const params = new URLSearchParams({ q: query })
    if (typeof datasetId === 'number') {
      params.append('dataset_id', datasetId.toString())
    }
    
    const response = await axios.get<SchemaResponse[]>(`${API_BASE}/schemas/search?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to search schemas'
    throw new Error(errorMessage)
  }
}

// GET /schemas/statistics
export async function getSchemaStatistics(datasetId?: number): Promise<any> {
  try {
    const url = typeof datasetId === 'number'
      ? `${API_BASE}/schemas/statistics?dataset_id=${encodeURIComponent(datasetId)}`
      : `${API_BASE}/schemas/statistics`
    
    const response = await axios.get<any>(url, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get schema statistics'
    throw new Error(errorMessage)
  }
}



