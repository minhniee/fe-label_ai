import api from './client'

// =============================================
// AUDIT TYPES
// =============================================

export interface AuditEventItem {
  event_id: number
  occurred_at: string  // datetime from backend
  user_id?: number
  action: string
  resource_type?: string
  resource_id?: number
  request_id?: string
  http_method?: string
  path?: string  // endpoint path from backend
  status_code?: number
  ip_address?: string
  user_agent?: string
  extra?: Record<string, any>
}

export interface AuditChangeItem {
  change_id: number
  changed_at: string  // datetime from backend
  user_id?: number
  table_name: string
  operation: string
  primary_key: Record<string, any>  // primary key dict from backend
  old_row?: Record<string, any>  // old values from backend
  new_row?: Record<string, any>  // new values from backend
  diff?: Record<string, any>
  request_id?: string
}

export interface AuditEventQuery {
  page?: number
  page_size?: number
  user_id?: number
  action?: string
  resource_type?: string
  resource_id?: number
  request_id?: string
  http_method?: string
  status_code?: number
  ip_address?: string
  from_time?: string
  to_time?: string
}

export interface AuditChangeQuery {
  page?: number
  page_size?: number
  user_id?: number
  table_name?: string
  operation?: string
  request_id?: string
  from_time?: string
  to_time?: string
}

export interface PagedResponse<T = any> {
  total: number
  page: number
  page_size: number
  items: T[]
}

export type AuditEventsResponse = PagedResponse<AuditEventItem>
export type AuditChangesResponse = PagedResponse<AuditChangeItem>

// =============================================
// AUDIT API FUNCTIONS
// =============================================

// GET /audit/events
export async function listAuditEvents(query?: AuditEventQuery) {
  try {
    const params = new URLSearchParams()
    if (query?.page) params.append('page', query.page.toString())
    if (query?.page_size) params.append('page_size', query.page_size.toString())
    if (query?.user_id) params.append('user_id', query.user_id.toString())
    if (query?.action) params.append('action', query.action)
    if (query?.resource_type) params.append('resource_type', query.resource_type)
    if (query?.resource_id) params.append('resource_id', query.resource_id.toString())
    if (query?.request_id) params.append('request_id', query.request_id)
    if (query?.http_method) params.append('http_method', query.http_method)
    if (query?.status_code) params.append('status_code', query.status_code.toString())
    if (query?.ip_address) params.append('ip_address', query.ip_address)
    if (query?.from_time) params.append('from_time', query.from_time)
    if (query?.to_time) params.append('to_time', query.to_time)

    const url = params.toString() 
      ? `/audit/events?${params.toString()}`
      : `/audit/events`
      
    const response = await api.get<AuditEventsResponse>(url, {
    })
    return response.data
  } catch (error: any) {
    // Preserve the original error with status code and response data
    if (error.response) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to list audit events'
      const enhancedError = new Error(errorMessage)
      ;(enhancedError as any).response = error.response
      ;(enhancedError as any).status = error.response.status
      throw enhancedError
    }
    // Network errors (CORS, connection refused, etc.)
    const errorMessage = error.message || 'Failed to list audit events'
    const enhancedError = new Error(errorMessage)
    ;(enhancedError as any).isNetworkError = true
    throw enhancedError
  }
}

// GET /audit/changes
export async function listAuditChanges(query?: AuditChangeQuery) {
  try {
    const params = new URLSearchParams()
    if (query?.page) params.append('page', query.page.toString())
    if (query?.page_size) params.append('page_size', query.page_size.toString())
    if (query?.user_id) params.append('user_id', query.user_id.toString())
    if (query?.table_name) params.append('table_name', query.table_name)
    if (query?.operation) params.append('operation', query.operation)
    if (query?.request_id) params.append('request_id', query.request_id)
    if (query?.from_time) params.append('from_time', query.from_time)
    if (query?.to_time) params.append('to_time', query.to_time)

    const url = params.toString() 
      ? `/audit/changes?${params.toString()}`
      : `/audit/changes`
      
    const response = await api.get<AuditChangesResponse>(url, {
    })
    return response.data
  } catch (error: any) {
    // Preserve the original error with status code and response data
    if (error.response) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to list audit changes'
      const enhancedError = new Error(errorMessage)
      ;(enhancedError as any).response = error.response
      ;(enhancedError as any).status = error.response.status
      throw enhancedError
    }
    // Network errors (CORS, connection refused, etc.)
    const errorMessage = error.message || 'Failed to list audit changes'
    const enhancedError = new Error(errorMessage)
    ;(enhancedError as any).isNetworkError = true
    throw enhancedError
  }
}

