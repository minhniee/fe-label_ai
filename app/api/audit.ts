import api from "./client"

// =============================================
// TYPES
// =============================================

export interface AuditLogRecord {
  event_id?: number
  ts?: string
  tenant_id?: string
  severity?: string
  env?: string
  event_type?: string
  event_action?: string
  event_target_id?: string
  actor_user_id?: string
  actor_role?: string
  actor_ip?: string
  req_method?: string
  req_path?: string
  req_trace_id?: string
  ctx_json?: Record<string, any> | string | null
}

export interface AuditListResponse {
  message: string
  data: AuditLogRecord[]
  total: number
  limit: number
  offset: number
  filters?: Record<string, any>
  query?: string
}

export interface UserAuditParams {
  limit?: number
  offset?: number
}

export interface AdminAuditFilters extends UserAuditParams {
  tenant_id?: string
  event_type?: string
  actor_user_id?: string
  from_date?: string
  to_date?: string
}

export interface AuditSearchParams extends UserAuditParams {
  q: string
}

export interface UploadResponse {
  message: string
  status: string
  file?: string
}

export interface UploadScanResponse {
  message: string
  directory: string
  pattern: string
  count: number
  files?: (string | number)[]
  status: string
}

export interface UploadStatusResponse {
  is_running: boolean
  upload_interval_minutes: number
  auto_upload_enabled: boolean
  gcs_upload_enabled: boolean
  scan_patterns: string[]
  audit_log_dir: string
  ndjson_dir: string
  purge_ndjson_enabled: boolean
  purge_ndjson_after_minutes: number
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
// AUDIT API FUNCTIONS (NEW ROUTES)
// =============================================

// GET /audit/user/{id}
export async function getUserAuditLogs(userId: number, params?: UserAuditParams) {
  try {
    const qs = buildQuery({
      limit: params?.limit,
      offset: params?.offset,
    })
    const url = qs ? `/audit/user/${userId}?${qs}` : `/audit/user/${userId}`
    const response = await api.get<AuditListResponse>(url)
    return response.data
  } catch (error: any) {
    handleApiError("Failed to load user audit logs", error)
  }
}

// GET /audit/all
export async function getAllAuditLogs(filters?: AdminAuditFilters) {
  try {
    const qs = buildQuery({
      tenant_id: filters?.tenant_id,
      event_type: filters?.event_type,
      actor_user_id: filters?.actor_user_id,
      from_date: filters?.from_date,
      to_date: filters?.to_date,
      limit: filters?.limit,
      offset: filters?.offset,
    })
    const url = qs ? `/audit/all?${qs}` : `/audit/all`
    const response = await api.get<AuditListResponse>(url)
    return response.data
  } catch (error: any) {
    handleApiError("Failed to load audit logs", error)
  }
}

// GET /audit/search
export async function searchAuditLogs(params: AuditSearchParams) {
  if (!params.q?.trim()) {
    throw new Error("Search query is required")
  }
  try {
    const qs = buildQuery({
      q: params.q,
      limit: params.limit,
      offset: params.offset,
    })
    const response = await api.get<AuditListResponse>(`/audit/search?${qs}`)
    return response.data
  } catch (error: any) {
    handleApiError("Failed to search audit logs", error)
  }
}

// POST /audit/upload-local-file
export async function uploadAuditLocalFile(path: string) {
  if (!path?.trim()) {
    throw new Error("Path is required")
  }
  try {
    const qs = buildQuery({ path })
    const response = await api.post<UploadResponse>(`/audit/upload-local-file?${qs}`)
    return response.data
  } catch (error: any) {
    handleApiError("Failed to upload audit file", error)
  }
}

// POST /audit/upload-scan
export async function scanAndUploadAuditLogs(params?: { root?: string; pattern?: string }) {
  try {
    const qs = buildQuery({
      root: params?.root,
      pattern: params?.pattern,
    })
    const url = qs ? `/audit/upload-scan?${qs}` : `/audit/upload-scan`
    const response = await api.post<UploadScanResponse>(url)
    return response.data
  } catch (error: any) {
    handleApiError("Failed to scan and upload audit logs", error)
  }
}

// POST /audit/upload-trigger
export async function triggerAuditUpload() {
  try {
    const response = await api.post<UploadResponse>("/audit/upload-trigger")
    return response.data
  } catch (error: any) {
    handleApiError("Failed to trigger audit upload", error)
  }
}

// GET /audit/upload-status
export async function getAuditUploadStatus() {
  try {
    const response = await api.get<UploadStatusResponse>("/audit/upload-status")
    return response.data
  } catch (error: any) {
    handleApiError("Failed to fetch upload status", error)
  }
}

// =============================================
// LEGACY HELPERS (FOR EXISTING UI)
// =============================================

export interface AuditEventItem {
  event_id: number
  occurred_at: string
  user_id?: number
  action: string
  resource_type?: string
  resource_id?: number
  request_id?: string
  http_method?: string
  path?: string
  status_code?: number
  ip_address?: string
  user_agent?: string
  extra?: Record<string, any>
}

export interface AuditChangeItem {
  change_id: number
  changed_at: string
  user_id?: number
  table_name: string
  operation: string
  primary_key: Record<string, any>
  old_row?: Record<string, any>
  new_row?: Record<string, any>
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

function mapLogToEventItem(log: AuditLogRecord): AuditEventItem {
  const context = typeof log.ctx_json === "object" && log.ctx_json !== null ? log.ctx_json : undefined
  return {
    event_id: log.event_id ?? Date.now(),
    occurred_at: log.ts || new Date().toISOString(),
    user_id: log.actor_user_id ? Number(log.actor_user_id) : undefined,
    action: log.event_action || log.event_type || "event",
    resource_type: log.event_target_id ? String(log.event_target_id) : undefined,
    resource_id: undefined,
    request_id: log.req_trace_id,
    http_method: log.req_method,
    path: log.req_path,
    status_code: undefined,
    ip_address: log.actor_ip,
    user_agent: undefined,
    extra: context,
  }
}

function mapLogToChangeItem(log: AuditLogRecord): AuditChangeItem {
  const context = typeof log.ctx_json === "object" && log.ctx_json !== null ? log.ctx_json : undefined
  return {
    change_id: log.event_id ?? Date.now(),
    changed_at: log.ts || new Date().toISOString(),
    user_id: log.actor_user_id ? Number(log.actor_user_id) : undefined,
    table_name: log.event_type || "unknown",
    operation: (log.event_action || "UPDATE").toUpperCase(),
    primary_key: {},
    old_row: undefined,
    new_row: undefined,
    diff: context,
    request_id: log.req_trace_id,
  }
}

export async function listAuditEvents(query?: AuditEventQuery) {
  const page = query?.page ?? 1
  const pageSize = query?.page_size ?? 20
  const filters: AdminAuditFilters = {
    actor_user_id: query?.user_id ? String(query.user_id) : undefined,
    event_type: query?.resource_type || query?.action,
    from_date: query?.from_time,
    to_date: query?.to_time,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  }

  const response = await getAllAuditLogs(filters)
  return {
    total: response?.total || 0,
    page,
    page_size: pageSize,
    items: (response?.data || []).map(mapLogToEventItem),
  } as PagedResponse<AuditEventItem>
}

export async function listAuditChanges(query?: AuditChangeQuery) {
  const page = query?.page ?? 1
  const pageSize = query?.page_size ?? 20
  const filters: AdminAuditFilters = {
    actor_user_id: query?.user_id ? String(query.user_id) : undefined,
    event_type: query?.table_name,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  }

  const response = await getAllAuditLogs(filters)
  return {
    total: response?.total || 0,
    page,
    page_size: pageSize,
    items: (response?.data || []).map(mapLogToChangeItem),
  } as PagedResponse<AuditChangeItem>
}


