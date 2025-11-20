import api from './client'

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
  created_by_username?: string
  created_at: string
  updated_at?: string
  version?: number
}

// Optional types for ontology-related endpoints
export type OntologyStructure = any

export interface OntologyValidationResponse {
  is_valid: boolean
  valid?: boolean // Backward compatibility
  errors?: string[]
  warnings?: string[]
  label_count?: number
  hierarchy_levels?: number
}

export interface SchemaCompareResponse {
  left_schema_id?: number
  right_schema_id?: number
  schema1?: SchemaVersionResponse
  schema2?: SchemaVersionResponse
  differences: any
}

export interface SchemaHistoryResponse {
  schema_id: number
  version: number
  name: string
  created_at: string
  created_by?: number
  created_by_username?: string
  changes?: string
  is_current?: boolean
}

export interface SchemaVersionResponse {
  schema_id: number
  version: number
  name?: string
  schema_definition: any
  created_at: string
  created_by?: number
  created_by_username?: string
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
    const response = await api.post<SchemaResponse>(
      `/schemas/?dataset_id=${encodeURIComponent(datasetId)}`,
      data
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
      ? `/schemas/?dataset_id=${encodeURIComponent(datasetId)}`
      : `/schemas/`

    const response = await api.get<SchemaResponse[]>(url)
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get schemas'
    throw new Error(errorMessage)
  }
}

// GET /schemas/{schema_id}
export async function getSchema(schemaId: number): Promise<SchemaResponse> {
  try {
    const response = await api.get<SchemaResponse>(`/schemas/${schemaId}`)
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get schema'
    throw new Error(errorMessage)
  }
}

// PUT /schemas/{schema_id}
export async function updateSchema(schemaId: number, data: SchemaUpdateRequest): Promise<SchemaResponse> {
  try {
    const response = await api.put<SchemaResponse>(`/schemas/${schemaId}`, data)
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to update schema'
    throw new Error(errorMessage)
  }
}

// DELETE /schemas/{schema_id}
export async function deleteSchema(schemaId: number): Promise<void> {
  try {
    await api.delete(`/schemas/${schemaId}`)
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete schema'
    throw new Error(errorMessage)
  }
}

// GET /schemas/dataset/{dataset_id}
export async function getSchemasByDataset(datasetId: number): Promise<SchemaResponse[]> {
  try {
    const response = await api.get<SchemaResponse[]>(`/schemas/dataset/${datasetId}`)
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get schemas by dataset'
    throw new Error(errorMessage)
  }
}

// GET /schemas/{schema_id}/ontology
export async function getOntology(schemaId: number): Promise<OntologyStructure> {
  try {
    const response = await api.get<OntologyStructure>(`/schemas/${schemaId}/ontology`)
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get ontology'
    throw new Error(errorMessage)
  }
}

// PUT /schemas/{schema_id}/ontology
export async function updateOntology(schemaId: number, ontology: OntologyStructure): Promise<SchemaResponse> {
  try {
    const response = await api.put<SchemaResponse>(`/schemas/${schemaId}/ontology`, ontology)
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to update ontology'
    throw new Error(errorMessage)
  }
}

// POST /schemas/validate
export async function validateOntology(ontology: OntologyStructure): Promise<OntologyValidationResponse> {
  try {
    const response = await api.post<OntologyValidationResponse>(`/schemas/validate`, ontology)
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to validate ontology'
    throw new Error(errorMessage)
  }
}

// GET /schemas/{schema_id}/compare/{other_schema_id}
export async function compareSchemas(schemaId: number, otherSchemaId: number): Promise<SchemaCompareResponse> {
  try {
    const response = await api.get<SchemaCompareResponse>(`/schemas/${schemaId}/compare/${otherSchemaId}`)
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to compare schemas'
    throw new Error(errorMessage)
  }
}

// GET /schemas/{schema_id}/versions
export async function getSchemaVersions(schemaId: number): Promise<SchemaHistoryResponse[]> {
  try {
    const response = await api.get<SchemaHistoryResponse[]>(`/schemas/${schemaId}/versions`)
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
    // Backend expects body as OntologyStructure, and optional `changes` as query parameter
    const url = typeof changes === 'string' && changes.length > 0
      ? `/schemas/${schemaId}/versions?changes=${encodeURIComponent(changes)}`
      : `/schemas/${schemaId}/versions`

    const response = await api.post<SchemaResponse>(url, payload)
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to create schema version'
    throw new Error(errorMessage)
  }
}

// GET /schemas/{schema_id}/versions/{version}
export async function getSchemaVersion(schemaId: number, version: number): Promise<SchemaVersionResponse> {
  try {
    const response = await api.get<SchemaVersionResponse>(`/schemas/${schemaId}/versions/${version}`)
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
    const response = await api.post<SchemaFileResponse>(`/schemas/${schemaId}/files`, form, {
      headers: {
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
    const response = await api.get<SchemaFileResponse[]>(`/schemas/${schemaId}/files`)
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get schema files'
    throw new Error(errorMessage)
  }
}

// GET /schemas/files/{file_id}
export async function getSchemaFile(fileId: number): Promise<SchemaFileResponse> {
  try {
    const response = await api.get<SchemaFileResponse>(`/schemas/files/${fileId}`)
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get schema file'
    throw new Error(errorMessage)
  }
}

// DELETE /schemas/files/{file_id}
export async function deleteSchemaFile(fileId: number): Promise<void> {
  try {
    await api.delete(`/schemas/files/${fileId}`)
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
    
    const response = await api.get<SchemaResponse[]>(`/schemas/search?${params.toString()}`)
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
      ? `/schemas/statistics?dataset_id=${encodeURIComponent(datasetId)}`
      : `/schemas/statistics`
    
    const response = await api.get<any>(url)
    return response.data
  } catch (error: any) {
    // Better error handling for 422
    let errorMessage = 'Failed to get schema statistics';
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.response.data.detail) {
        errorMessage = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail);
      } else {
        errorMessage = JSON.stringify(error.response.data);
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
}



