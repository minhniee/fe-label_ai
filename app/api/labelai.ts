import { getAuthHeaders } from "./auth"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000" // Đảm bảo biến env này trỏ về BE thật, không qua proxy FE

/**
 * Centralized API management for LabelAI functionality
 * All functions include authentication headers automatically
 */

/**
 * Get dataset version data
 */
export async function getDatasetVersionData(datasetId: string, versionId: string) {
  try {
    const response = await fetch(`${API_BASE}/datasets/${datasetId}/versions/${versionId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to get dataset version data"
    throw new Error(errorMessage)
  }
}

/**
 * Get all datasets
 */
export async function getDatasets() {
  try {
    const response = await fetch(`${API_BASE}/datasets`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.detail || errorData.error || `HTTP ${response.status}`,
        datasets: []
      }
    }

    const datasets = await response.json()
    
    // Transform backend format to frontend format
    const transformedDatasets = (Array.isArray(datasets) ? datasets : []).map((ds: any) => ({
      id: String(ds.dataset_id),
      name: ds.name || '',
      description: ds.description || '',
      rowCount: 0, // Will be populated by version data
      columns: [],
      createdAt: ds.created_at || new Date().toISOString(),
    }))
    
    return {
      success: true,
      datasets: transformedDatasets
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to get datasets"
    return {
      success: false,
      error: errorMessage,
      datasets: []
    }
  }
}

/**
 * Get dataset versions
 */
export async function getDatasetVersions(datasetId: string) {
  try {
    const response = await fetch(`${API_BASE}/datasets/${datasetId}/versions`, {
      method: "GET",
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.detail || errorData.error || `HTTP ${response.status}`,
        versions: []
      }
    }

    const versions = await response.json()
    
    // Get files for each version to populate data
    const transformedVersions = await Promise.all(
      (Array.isArray(versions) ? versions : []).map(async (v: any) => {
        let rowCount = 0
        let columnCount = 0
        let columns: string[] = []
        let fileName = `Version ${v.version_number}`
        
        try {
          // Get files for this version
          const filesResponse = await fetch(`${API_BASE}/datasets/versions/${v.version_id}/files`, {
            headers: getAuthHeaders(),
          })
          
          if (filesResponse.ok) {
            const files = await filesResponse.json()
            if (Array.isArray(files) && files.length > 0) {
              const file = files[0]
              rowCount = file.line_count || 0
              columnCount = file.column_count || 0
              columns = file.column_names || []
              fileName = file.file_name || fileName
            }
          }
        } catch (err) {
          // If fetching file data fails, use defaults
        }
        
        return {
          id: String(v.version_id),
          versionNumber: String(v.version_number),
          fileName,
          description: v.changelog || '',
          rowCount,
          columnCount,
          columns,
          uploadDate: v.created_at || new Date().toISOString(),
          status: 'active'
        }
      })
    )
    
    return {
      success: true,
      versions: transformedVersions
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to get dataset versions"
    return {
      success: false,
      error: errorMessage,
      versions: []
    }
  }
}

/**
 * Label data using AI
 */
export async function labelData(data: {
  rows: any[]
  model: string
  apiKey: string
  contextColumn: string
  resultColumn?: string
  referenceContext?: string
  multiColumnConfig?: any
}) {
  try {
    // Call backend endpoint directly to support all models (GPT, Claude, DeepSeek, Qwen, etc.)
    const response = await fetch(`${API_BASE}/ai-labeling/label`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        rows: data.rows,
        model: data.model,
        apiKey: data.apiKey,
        contextColumn: data.contextColumn,
        resultColumn: data.resultColumn || "",
        referenceContext: data.referenceContext || "",
        multiColumnConfig: Array.isArray(data.multiColumnConfig) ? data.multiColumnConfig : [],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to label data"
    throw new Error(errorMessage)
  }
}

/**
 * AI Search
 */
export async function aiSearch(query: string) {
  try {
    const response = await fetch(`${API_BASE}/ai-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to search"
    throw new Error(errorMessage)
  }
}

/**
 * Generate data
 */
export async function generateData(data: {
  topic: string
  rowCount: number
  columns: string[]
  instructions?: string
  referenceContext?: string
  apiKey?: string
}) {
  try {
    const response = await fetch(`${API_BASE}/gen-ai/generate-dataset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        topic: data.topic,
        row_count: data.rowCount,
        columns: data.columns.join(", "),
        instructions: data.instructions || "",
        reference_context: data.referenceContext || "",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to generate data"
    throw new Error(errorMessage)
  }
}

/**
 * Generate more data (from uploaded reference file)
 */
export async function generateMoreData(data: {
  columns: string[];
  count: number;
  prompt: string;
  contextColumn: string;
  apiKey: string;
  model: string;
  referenceFileContent: string;
}) {
  try {
    const response = await fetch(`${API_BASE}/gen-ai/generate-rows-from-file`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        file_content: data.referenceFileContent,
        columns: data.columns,
        count: data.count,
        prompt: data.prompt,
        context_column: data.contextColumn,
        api_key: data.apiKey,
        model: data.model,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to generate more data";
    throw new Error(errorMessage);
  }
}

/**
 * Submit dataset
 */
export async function submitDataset(data: any) {
  try {
    const response = await fetch(`${API_BASE}/datasets/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to submit dataset"
    throw new Error(errorMessage)
  }
}

/**
 * Parse reference file
 */
export async function parseReference(file: File) {
  try {
    const formData = new FormData()
    formData.append("file", file)

    const headers: Record<string, string> = {}
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
    } catch {}

    // === Lưu ý: đây là gọi API trực tiếp về backend, không gửi qua FE API route để tránh limit body size ===
    const response = await fetch(`${API_BASE}/gen-ai/parse-reference`, {
      method: "POST",
      headers,
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to parse reference file"
    throw new Error(errorMessage)
  }
}

/**
 * Test API key
 */
export async function testApiKey(apiKey: string, model: string = "gemini-flash-2.5") {
  try {
    const response = await fetch(`${API_BASE}/ai-labeling/test-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        apiKey,
        model,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to test API key"
    throw new Error(errorMessage)
  }
}
