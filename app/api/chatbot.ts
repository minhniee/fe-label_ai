import api from "./client"

export interface ChatbotStatus {
  total_questions: number
  status: "healthy" | "error"
}

export interface ChatbotDataset {
  dataset_id: number
  name: string
  description?: string
  dataset_type: string
  status: string
  created_at: string
}

export interface ChatMessage {
  query: string
  answer: string
  context?: string[]
}

export interface ChatHistory {
  chat_id: number
  query: string
  answer: string
  created_at: string
  response_time?: number
}

/**
 * Get chatbot status
 */
export async function getChatbotStatus(datasetId?: number): Promise<ChatbotStatus> {
  try {
    const params = datasetId ? `?dataset_id=${datasetId}` : ""
    const response = await api.get(`/api/chatbot/status${params}`)
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error.message || "Failed to get chatbot status"
    throw new Error(errorMessage)
  }
}

/**
 * Send message to chatbot
 */
export async function sendChatMessage(
  query: string,
  topK: number = 2,
  options?: { datasetId?: number; projectId?: number }
): Promise<ChatMessage> {
  try {
    const params = new URLSearchParams()
    if (options?.datasetId) params.append("dataset_id", String(options.datasetId))
    if (options?.projectId) params.append("project_id", String(options.projectId))
    const queryString = params.toString()

    const response = await api.post(`/api/chatbot/chat${queryString ? `?${queryString}` : ""}`, {
      query,
      top_k: topK,
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error.message || "Failed to send message"
    throw new Error(errorMessage)
  }
}

/**
 * Get chatbot datasets
 */
export async function getChatbotDatasets(): Promise<{ datasets: ChatbotDataset[] }> {
  try {
    const response = await api.get("/api/chatbot/datasets")
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error.message || "Failed to get datasets"
    throw new Error(errorMessage)
  }
}

/**
 * Switch to a specific dataset
 */
export interface SwitchDatasetResponse {
  message: string
  total_questions: number
  fine_tune_triggered?: boolean
  fine_tune_reason?: string
  job_id?: string
  needs_refresh?: boolean
}

export async function switchChatbotDataset(
  datasetId: number,
  options?: { projectId?: number }
): Promise<SwitchDatasetResponse> {
  try {
    const params = new URLSearchParams({ dataset_id: String(datasetId) })
    if (options?.projectId) params.append("project_id", String(options.projectId))
    const response = await api.post(`/api/chatbot/reload?${params.toString()}`)
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error.message || "Failed to switch dataset"
    throw new Error(errorMessage)
  }
}

/**
 * Get chat history
 */
export async function getChatHistory(limit: number = 20, projectId?: number): Promise<{ chats: ChatHistory[] }> {
  try {
    const params = new URLSearchParams({ limit: limit.toString() })
    if (projectId) {
      params.append("project_id", projectId.toString())
    }
    const response = await api.get(`/api/chatbot/chat-history?${params.toString()}`)
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error.message || "Failed to get chat history"
    throw new Error(errorMessage)
  }
}

/**
 * Delete a chat message
 */
export async function deleteChatMessage(chatId: number): Promise<void> {
  try {
    await api.delete(`/api/chatbot/chat-history/${chatId}`)
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error.message || "Failed to delete chat"
    throw new Error(errorMessage)
  }
}

// ============================================================
// FINE-TUNING API FUNCTIONS
// ============================================================

export interface FineTuneJob {
  ft_id: number
  job_id: string
  dataset_id: number
  base_model: string
  status: "pending" | "running" | "succeeded" | "failed" | "cancelled"
  fine_tuned_model?: string
  error_message?: string
  created_at: string
  updated_at?: string
}

export interface FineTuneJobDetail extends FineTuneJob {
  training_file_id?: string
  finished_at?: number
  trained_tokens?: number
  error?: string
}

export interface FineTunedModel {
  dataset_id: number
  has_model: boolean
  model_name?: string
  ft_id?: number
  job_id?: string
  created_at?: string
}

export interface StartFineTuneRequest {
  dataset_id: number
  suffix?: string
  n_epochs?: number
}

export interface StartFineTuneResponse {
  status: string
  message: string
  job: FineTuneJob
}

/**
 * Start a fine-tuning job for a dataset
 */
export async function startFineTuning(
  request: StartFineTuneRequest
): Promise<StartFineTuneResponse> {
  try {
    const response = await api.post("/api/fine-tune/start", request)
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error.message || "Failed to start fine-tuning"
    throw new Error(errorMessage)
  }
}

/**
 * Get list of fine-tuning jobs
 */
export async function getFineTuningJobs(
  datasetId?: number,
  limit: number = 20
): Promise<{ jobs: FineTuneJob[] }> {
  try {
    const params = new URLSearchParams({ limit: limit.toString() })
    if (datasetId) {
      params.append("dataset_id", datasetId.toString())
    }
    const response = await api.get(`/api/fine-tune/jobs?${params.toString()}`)
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error.message || "Failed to get fine-tuning jobs"
    throw new Error(errorMessage)
  }
}

/**
 * Get details of a specific fine-tuning job
 */
export async function getFineTuningJob(jobId: string): Promise<FineTuneJobDetail> {
  try {
    const response = await api.get(`/api/fine-tune/jobs/${jobId}`)
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error.message || "Failed to get job details"
    throw new Error(errorMessage)
  }
}

/**
 * Check and update job status from OpenAI
 */
export async function checkJobStatus(jobId: string): Promise<FineTuneJob> {
  try {
    const response = await api.post(`/api/fine-tune/check-job/${jobId}`)
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error.message || "Failed to check job status"
    throw new Error(errorMessage)
  }
}

/**
 * Get fine-tuned model for a dataset
 */
export async function getFineTunedModel(datasetId: number): Promise<FineTunedModel> {
  try {
    const response = await api.get(`/api/fine-tune/models/${datasetId}`)
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error.message || "Failed to get fine-tuned model"
    throw new Error(errorMessage)
  }
}

// ============================================================
// FINE-TUNING STATUS API FUNCTIONS
// ============================================================

export interface FineTuneStatus {
  dataset_id: number
  has_model: boolean
  model_name?: string
  model_created_at?: string
  active_job?: {
    job_id: string
    status: string
    created_at?: string
  }
  latest_job?: {
    job_id: string
    status: string
    fine_tuned_model?: string
    error_message?: string
    created_at?: string
    updated_at?: string
  }
  needs_refresh: boolean
  refresh_reason?: string
}

/**
 * Get fine-tuning status for a dataset
 */
export async function getFineTuneStatus(datasetId: number): Promise<FineTuneStatus> {
  try {
    const response = await api.get(`/api/chatbot/fine-tune-status/${datasetId}`)
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error.message || "Failed to get fine-tuning status"
    throw new Error(errorMessage)
  }
}

/**
 * Trigger fine-tuning for a dataset manually
 */
export async function triggerFineTuning(datasetId: number): Promise<StartFineTuneResponse> {
  try {
    const response = await api.post(`/api/chatbot/fine-tune-trigger/${datasetId}`)
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error.message || "Failed to trigger fine-tuning"
    throw new Error(errorMessage)
  }
}