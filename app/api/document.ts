import api from "./client"

export interface DocumentCitation {
  document_id: number
  document_name: string
  chunk_id: number
  chunk_index: number
  content: string
  similarity_score: number
  metadata?: Record<string, any>
}

export interface DocumentSearchResponse {
  success: boolean
  query: string
  num_results: number
  results: DocumentCitation[]
}

/**
 * Search documents in a project
 */
export async function searchDocuments(
  projectId: number,
  query: string,
  topK: number = 5,
  minScore: number = 0.3,
  embeddingProvider: string = "local",
  embeddingApiKey?: string,
  embeddingModel?: string
): Promise<DocumentSearchResponse> {
  try {
    const params = new URLSearchParams({
      project_id: projectId.toString(),
      query,
      top_k: topK.toString(),
      min_score: minScore.toString(),
      embedding_provider: embeddingProvider,
    })
    
    if (embeddingApiKey) {
      params.append("embedding_api_key", embeddingApiKey)
    }
    if (embeddingModel) {
      params.append("embedding_model", embeddingModel)
    }

    const response = await api.post<DocumentSearchResponse>(
      `/documents/search?${params.toString()}`,
      {}
    )
    return response.data
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error.message ||
      "Failed to search documents"
    throw new Error(errorMessage)
  }
}

