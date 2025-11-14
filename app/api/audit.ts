import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true

// Helper function to get auth headers
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

// =============================================
// AUDIT TYPES
// =============================================

export interface AuditEventItem {
  event_id: number
  user_id?: number
  username?: string
  action: string
  resource_type?: string
  resource_id?: number
  request_id?: string
  http_method?: string
  endpoint?: string
  status_code?: number
  ip_address?: string
  user_agent?: string
  request_body?: any
  response_body?: any
  error_message?: string
  timestamp: string
}

export interface AuditChangeItem {
  change_id: number
  user_id?: number
  username?: string
  table_name: string
  operation: string
  record_id: number
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  request_id?: string
  timestamp: string
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
      ? `${API_BASE}/audit/events?${params.toString()}`
      : `${API_BASE}/audit/events`
      
    const response = await axios.get<AuditEventsResponse>(url, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to list audit events'
    throw new Error(errorMessage)
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
      ? `${API_BASE}/audit/changes?${params.toString()}`
      : `${API_BASE}/audit/changes`
      
    const response = await axios.get<AuditChangesResponse>(url, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to list audit changes'
    throw new Error(errorMessage)
  }
}

