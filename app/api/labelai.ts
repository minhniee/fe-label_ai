const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

// Helper function to get auth headers (keeping for backward compatibility)
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

/**
 * Get dataset version data
 */
export async function getDatasetVersionData(datasetId: string, versionId: string) {
  try {
    const response = await fetch(`/api/datasets/${datasetId}/versions/${versionId}`, {
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
    const response = await fetch("/api/datasets", {
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
    const errorMessage = error instanceof Error ? error.message : "Failed to get datasets"
    throw new Error(errorMessage)
  }
}

/**
 * Get dataset versions
 */
export async function getDatasetVersions(datasetId: string) {
  try {
    const response = await fetch(`/api/datasets/${datasetId}/versions`, {
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
    const errorMessage = error instanceof Error ? error.message : "Failed to get dataset versions"
    throw new Error(errorMessage)
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
    const response = await fetch("/api/ai-search", {
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
export async function generateData(data: any) {
  try {
    const response = await fetch("/api/generate-data", {
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
    const errorMessage = error instanceof Error ? error.message : "Failed to generate data"
    throw new Error(errorMessage)
  }
}

/**
 * Generate more data
 */
export async function generateMoreData(data: any) {
  try {
    const response = await fetch("/api/generate-more-data", {
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
    const errorMessage = error instanceof Error ? error.message : "Failed to generate more data"
    throw new Error(errorMessage)
  }
}

/**
 * Submit dataset
 */
export async function submitDataset(data: any) {
  try {
    const response = await fetch("/api/datasets/submit", {
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

    const response = await fetch("/api/parse-reference", {
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
