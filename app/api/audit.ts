import api from "./client"

// =============================================
// TYPES - Matching Backend API
// =============================================

export interface AuditEventResponse {
  event_id: number
  occurred_at: string
  user_id?: number | null
  action: string
  resource_type?: string | null
  resource_id?: number | null
  request_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  http_method?: string | null
  path?: string | null
  status_code?: number | null
  extra?: Record<string, any> | null
}

export interface AuditChangeResponse {
  change_id: number
  changed_at: string
  user_id?: number | null
  table_name: string
  operation: string
  primary_key: Record<string, any>
  old_row?: Record<string, any> | null
  new_row?: Record<string, any> | null
  diff?: Record<string, any> | null
  request_id?: string | null
  event_id?: number | null
}

export interface AuditLogsListResponse {
  total: number
  events: AuditEventResponse[]
  limit: number
  has_more: boolean
}

export interface DeleteAuditResponse {
  success: boolean
  message: string
  deleted_events: number
  deleted_changes: number
}

export interface AuditActionStat {
  action: string
  count: number
}

export interface AuditActionStatsQuery {
  time_period?: "7d" | "30d" | "3m"
  limit?: number
}

export interface AuditLogsQuery {
  user_id?: number
  project_id?: number
  action?: string
  resource_type?: string
  from_time?: string // ISO datetime string
  to_time?: string // ISO datetime string
  limit?: number // default 100, max 1000
  offset?: number
}

// =============================================
// HELPERS
// =============================================

function buildQuery(params: Record<string, any> = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    qs.append(key, String(value))
  })
  return qs.toString()
}

function handleApiError(defaultMessage: string, error: any): never {
  if (error?.response) {
    const errorMessage = error.response?.data?.detail || error.message || defaultMessage
    const enhancedError = new Error(errorMessage)
    ;(enhancedError as any).response = error.response
    ;(enhancedError as any).status = error.response.status
    throw enhancedError
  }

  const errorMessage = error?.message || defaultMessage
  const enhancedError = new Error(errorMessage)
  ;(enhancedError as any).isNetworkError = true
  throw enhancedError
}

// =============================================
// API FUNCTIONS
// =============================================

/**
 * Get audit logs with filters
 * GET /admin/audit-logs
 */
export async function getAuditLogs(query?: AuditLogsQuery): Promise<AuditLogsListResponse> {
  try {
    const qs = buildQuery({
      user_id: query?.user_id,
      project_id: query?.project_id,
      action: query?.action,
      resource_type: query?.resource_type,
      from_time: query?.from_time,
      to_time: query?.to_time,
      limit: query?.limit || 100,
      offset: query?.offset ?? 0,
    })
    const url = qs ? `/admin/audit-logs?${qs}` : `/admin/audit-logs`
    const response = await api.get<AuditLogsListResponse>(url)
    return response.data
  } catch (error: any) {
    handleApiError("Failed to load audit logs", error)
  }
}

/**
 * Get changes for a specific audit event
 * GET /admin/audit-logs/{event_id}/changes
 */
export async function getEventChanges(eventId: number): Promise<AuditChangeResponse[]> {
  try {
    const response = await api.get<AuditChangeResponse[]>(`/admin/audit-logs/${eventId}/changes`)
    return response.data
  } catch (error: any) {
    handleApiError(`Failed to load changes for event ${eventId}`, error)
  }
}

/**
 * Delete audit logs for a project
 * DELETE /admin/audit-logs/projects/{project_id}
 */
export async function deleteAuditByProject(projectId: number): Promise<DeleteAuditResponse> {
  try {
    const response = await api.delete<DeleteAuditResponse>(`/admin/audit-logs/projects/${projectId}`)
    return response.data
  } catch (error: any) {
    handleApiError(`Failed to delete audit logs for project ${projectId}`, error)
  }
}

/**
 * Delete audit logs for a user
 * DELETE /admin/audit-logs/users/{user_id}
 */
export async function deleteAuditByUser(userId: number): Promise<DeleteAuditResponse> {
  try {
    const response = await api.delete<DeleteAuditResponse>(`/admin/audit-logs/users/${userId}`)
    return response.data
  } catch (error: any) {
    handleApiError(`Failed to delete audit logs for user ${userId}`, error)
  }
}

/**
 * Export all audit logs with filters (no pagination limit)
 * GET /admin/audit-logs (with limit=10000 to get all)
 */
export async function exportAllAuditLogs(query?: AuditLogsQuery): Promise<AuditEventResponse[]> {
  try {
    const allEvents: AuditEventResponse[] = []
    let offset = 0
    const limit = 1000 // Max per request
    let hasMore = true

    while (hasMore) {
      const qs = buildQuery({
        user_id: query?.user_id,
        project_id: query?.project_id,
        action: query?.action,
        resource_type: query?.resource_type,
        from_time: query?.from_time,
        to_time: query?.to_time,
        limit: limit,
        offset: offset,
      })
      const url = qs ? `/admin/audit-logs?${qs}` : `/admin/audit-logs`
      const response = await api.get<AuditLogsListResponse>(url)
      
      if (response.data.events && response.data.events.length > 0) {
        allEvents.push(...response.data.events)
        hasMore = response.data.has_more
        offset += response.data.events.length
      } else {
        hasMore = false
      }
    }

    return allEvents
  } catch (error: any) {
    handleApiError("Failed to export audit logs", error)
  }
}

/**
 * Get aggregated audit action stats
 * GET /admin/audit-logs/stats/actions
 */
export async function getAuditActionStats(
  params?: AuditActionStatsQuery
): Promise<AuditActionStat[]> {
  try {
    const qs = buildQuery({
      time_period: params?.time_period,
      limit: params?.limit,
    })
    const url = qs ? `/admin/audit-logs/stats/actions?${qs}` : `/admin/audit-logs/stats/actions`
    const response = await api.get<AuditActionStat[]>(url)
    return response.data
  } catch (error: any) {
    handleApiError("Failed to load audit action statistics", error)
  }
}
