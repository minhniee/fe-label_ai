import api from "./client"

export interface AnnotationHistoryEntry {
  history_id: number
  event_id: number
  occurred_at: string
  user_id: number | null
  username: string
  action: string
  project_id?: number
  project_name?: string
  change_summary?: string
  csv_diff?: {
    rows_changed?: number
    rows_added?: number
    rows_deleted?: number
    total_old_rows?: number
    total_new_rows?: number
    summary?: {
      columns_affected?: string[]
      most_changed_column?: string | null
    }
    changes?: Array<{
      row_index: number
      columns: Record<string, { old: any; new: any }>
    }>
    error?: string
  }
  annotation_count?: number
  annotation_status?: string
}

export async function getAnnotationHistory(
  fileId: number,
  options: { limit?: number; offset?: number } = {},
): Promise<AnnotationHistoryEntry[]> {
  const { limit = 20, offset = 0 } = options
  try {
    const response = await api.get<AnnotationHistoryEntry[]>(
      `/annotations/files/${fileId}/history`,
      { params: { limit, offset } },
    )
    return response.data
  } catch (error: any) {
    const message =
      error?.response?.data?.detail || error.message || "Failed to fetch annotation history"
    throw new Error(message)
  }
}
