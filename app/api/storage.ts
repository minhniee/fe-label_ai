import api from './client'

export interface StorageObjectInfo {
  key: string
  size: number
  last_modified?: string
  content_type?: string
  etag?: string
}

export interface StorageBucketInfo {
  provider: string
  bucket_name: string
  endpoint?: string
  region?: string
  total_objects?: number
  total_size?: number
}

export interface StorageObjectsListResponse {
  objects: StorageObjectInfo[]
  prefix: string
  total_count?: number
  has_more: boolean
  continuation_token?: string
}

export interface DeleteObjectResponse {
  success: boolean
  message: string
  deleted_key: string
}

export interface BulkDeleteRequest {
  keys: string[]
}

export interface DeleteObjectsResponse {
  success: boolean
  message: string
  deleted_count: number
  failed_count: number
  failed_keys: string[]
}

export async function getBucketInfo(): Promise<StorageBucketInfo> {
  try {
    const response = await api.get<StorageBucketInfo>('/admin/storage/info')
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get bucket info'
    throw new Error(errorMessage)
  }
}

export async function listObjects(
  prefix: string = '',
  maxKeys: number = 100,
  continuationToken?: string
): Promise<StorageObjectsListResponse> {
  try {
    const params: any = {
      prefix,
      max_keys: maxKeys,
    }
    if (continuationToken) {
      params.continuation_token = continuationToken
    }
    const response = await api.get<StorageObjectsListResponse>('/admin/storage/objects', { params })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to list objects'
    throw new Error(errorMessage)
  }
}

export async function deleteObject(key: string): Promise<DeleteObjectResponse> {
  try {
    const response = await api.delete<DeleteObjectResponse>(`/admin/storage/objects/${encodeURIComponent(key)}`)
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete object'
    throw new Error(errorMessage)
  }
}

export async function bulkDeleteObjects(keys: string[]): Promise<DeleteObjectsResponse> {
  try {
    const response = await api.post<DeleteObjectsResponse>('/admin/storage/objects/bulk-delete', { keys })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete objects'
    throw new Error(errorMessage)
  }
}

export async function getObjectInfo(key: string): Promise<StorageObjectInfo> {
  try {
    const response = await api.get<StorageObjectInfo>(`/admin/storage/objects/${encodeURIComponent(key)}/info`)
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get object info'
    throw new Error(errorMessage)
  }
}

export interface UserStorageUsage {
  user_id: number
  username: string
  email: string
  total_size: number
  object_count: number
}

export interface UserStorageUsageResponse {
  users: UserStorageUsage[]
  total_size: number
  total_objects: number
}

export async function getStorageUsageByUser(): Promise<UserStorageUsageResponse> {
  try {
    const response = await api.get<UserStorageUsageResponse>('/admin/storage/usage/by-user')
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to get storage usage by user'
    throw new Error(errorMessage)
  }
}

