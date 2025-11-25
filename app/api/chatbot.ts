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
}

/**
 * Get chatbot status
 */
export async function getChatbotStatus(): Promise<ChatbotStatus> {
  try {
    const response = await api.get("/api/chatbot/status")
    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.detail || error.message || "Failed to get chatbot status"
    throw new Error(errorMessage)
  }
}

/**
 * Send message to chatbot
 */
export async function sendChatMessage(query: string, topK: number = 2): Promise<ChatMessage> {
  try {
    const response = await api.post("/api/chatbot/chat", {
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
export async function switchChatbotDataset(datasetId: number): Promise<{ message: string; total_questions: number }> {
  try {
    const response = await api.post(`/api/chatbot/reload?dataset_id=${datasetId}`)
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

