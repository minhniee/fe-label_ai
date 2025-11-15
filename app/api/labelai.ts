import api from "./client"
/**
 * Get dataset version data
 */
export async function getDatasetVersionData(datasetId: string, versionId: string) {
  try {
    const response = await api.get(`/datasets/${datasetId}/versions/${versionId}`,{
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error?.response?.data?.error || error.message || "Failed to get dataset version data"
    throw new Error(errorMessage)
  }
}

/**
 * Get all datasets
 */
export async function getDatasets() {
  try {
    const response = await api.get(`/datasets`,{
    })
    const datasets = response.data
    
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
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error?.response?.data?.error || error.message || "Failed to get datasets"
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
    const response = await api.get(`/datasets/${datasetId}/versions`,{
    })
    const versions = response.data
    
    // Get files for each version to populate data
    const transformedVersions = await Promise.all(
      (Array.isArray(versions) ? versions : []).map(async (v: any) => {
        let rowCount = 0
        let columnCount = 0
        let columns: string[] = []
        let fileName = `Version ${v.version_number}`
        
        try {
          // Get files for this version
          const filesResponse = await api.get(`/datasets/versions/${v.version_id}/files`,{
          })
          const files = filesResponse.data
          if (Array.isArray(files) && files.length > 0) {
            const file = files[0]
            rowCount = file.line_count || 0
            columnCount = file.column_count || 0
            columns = file.column_names || []
            fileName = file.file_name || fileName
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
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error?.response?.data?.error || error.message || "Failed to get dataset versions"
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
    const response = await api.post(`/ai-labeling/label`, {
      rows: data.rows,
      model: data.model,
      apiKey: data.apiKey,
      contextColumn: data.contextColumn,
      resultColumn: data.resultColumn || "",
      referenceContext: data.referenceContext || "",
      multiColumnConfig: Array.isArray(data.multiColumnConfig) ? data.multiColumnConfig : [],
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || error.message || "Failed to label data"
    throw new Error(errorMessage)
  }
}

/**
 * AI Search
 */
export async function aiSearch(query: string) {
  try {
    const response = await api.post(`/ai-search`, { query },{
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || error.message || "Failed to search"
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
    const response = await api.post(`/gen-ai/generate-dataset`, {
      topic: data.topic,
      row_count: data.rowCount,
      columns: data.columns.join(", "),
      instructions: data.instructions || "",
      reference_context: data.referenceContext || "",
    },{
    })

    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || error?.response?.data?.detail || error.message || "Failed to generate data"
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
    const response = await api.post(`/gen-ai/generate-rows-from-file`, {
      file_content: data.referenceFileContent,
      columns: data.columns,
      count: data.count,
      prompt: data.prompt,
      context_column: data.contextColumn,
      api_key: data.apiKey,
      model: data.model,
    },{
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || error.message || "Failed to generate more data";
    throw new Error(errorMessage);
  }
}

/**
 * Submit dataset
 */
export async function submitDataset(data: any) {
  try {
    const response = await api.post(`/datasets/submit`, data,{
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || error.message || "Failed to submit dataset"
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

    const response = await api.post(`/gen-ai/parse-reference`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || error.message || "Failed to parse reference file"
    throw new Error(errorMessage)
  }
}

/**
 * Test API key
 */
export async function testApiKey(apiKey: string, model: string = "gemini-flash-2.5") {
  try {
    const response = await api.post(`/ai-labeling/test-key`, {
      apiKey,
      model,
    },{
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || error.message || "Failed to test API key"
    throw new Error(errorMessage)
  }
}

/**
 * Semantic Search API functions
 */

/**
 * Index a CSV file for semantic search
 */
export async function indexFileForSemanticSearch(fileId: number, textColumns?: string[], forceReindex: boolean = false) {
  try {
    const response = await api.post(`/api/semantic-search/index`, {
      file_id: fileId,
      text_columns: textColumns,
      force_reindex: forceReindex,
    }, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error?.response?.data?.error || error.message || "Failed to index file"
    throw new Error(errorMessage)
  }
}

/**
 * Perform semantic search on an indexed file
 */
export async function semanticSearch(fileId: number, query: string, topK: number = 10, minScore: number = 0.3) {
  try {
    const response = await api.post(`/api/semantic-search/search`, {
      file_id: fileId,
      query: query,
      top_k: topK,
      min_score: minScore,
    }, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error?.response?.data?.error || error.message || "Failed to search"
    throw new Error(errorMessage)
  }
}

/**
 * Check if a file is indexed
 */
export async function getSemanticSearchIndexStatus(fileId: number) {
  try {
    const response = await api.get(`/api/semantic-search/index-status/${fileId}`, {
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error?.response?.data?.error || error.message || "Failed to get index status"
    throw new Error(errorMessage)
  }
}