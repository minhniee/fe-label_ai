import api from "./client"

// =============================================
// TYPES
// =============================================

export interface NotificationResponse {
  notification_id: number
  user_id: number
  type: string
  title: string
  message: string
  read: boolean
  read_at: string | null
  created_at: string
  notification_metadata: Record<string, any> | null
}

export interface NotificationListResponse {
  notifications: NotificationResponse[]
  total: number
  unread_count: number
}

export interface MarkReadRequest {
  notification_ids: number[]
}

// =============================================
// API FUNCTIONS
// =============================================

/**
 * Get notifications for the current user
 * GET /notifications
 */
export async function getNotifications(params?: {
  read?: boolean
  limit?: number
}): Promise<NotificationListResponse> {
  try {
    const queryParams = new URLSearchParams()
    if (params?.read !== undefined) {
      queryParams.append("read", String(params.read))
    }
    if (params?.limit) {
      queryParams.append("limit", String(params.limit))
    }
    
    const url = queryParams.toString() 
      ? `/notifications?${queryParams.toString()}`
      : `/notifications`
    
    const response = await api.get<NotificationListResponse>(url)
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to get notifications"
    throw new Error(errorMessage)
  }
}

/**
 * Get unread notification count
 * GET /notifications/unread-count
 */
export async function getUnreadCount(): Promise<{ unread_count: number }> {
  try {
    const response = await api.get<{ unread_count: number }>("/notifications/unread-count")
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to get unread count"
    throw new Error(errorMessage)
  }
}

/**
 * Mark a notification as read
 * PUT /notifications/{notification_id}/read
 */
export async function markNotificationRead(notificationId: number): Promise<NotificationResponse> {
  try {
    const response = await api.put<NotificationResponse>(`/notifications/${notificationId}/read`)
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to mark notification as read"
    throw new Error(errorMessage)
  }
}

/**
 * Mark multiple notifications as read
 * PUT /notifications/mark-read
 */
export async function markNotificationsRead(notificationIds: number[]): Promise<{ marked_count: number; message: string }> {
  try {
    const response = await api.put<{ marked_count: number; message: string }>(
      "/notifications/mark-read",
      { notification_ids: notificationIds }
    )
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to mark notifications as read"
    throw new Error(errorMessage)
  }
}

/**
 * Delete a notification
 * DELETE /notifications/{notification_id}
 */
export async function deleteNotification(notificationId: number): Promise<{ message: string }> {
  try {
    const response = await api.delete<{ message: string }>(`/notifications/${notificationId}`)
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to delete notification"
    throw new Error(errorMessage)
  }
}

