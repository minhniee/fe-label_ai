/**
 * Custom hooks for API caching
 * Kết hợp React Query với custom cache service
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, queryInvalidation } from '@/lib/query-client'
import { apiCache, CACHE_KEYS, cacheUtils } from '@/lib/cache'
import { useCallback } from 'react'
import { toast } from '@/hooks/use-toast'

// Generic hook for cached API calls
export function useCachedQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean
    staleTime?: number
    cacheTime?: number
    refetchOnWindowFocus?: boolean
  }
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      // Thử lấy từ custom cache trước
      const cacheKey = queryKey.join('_')
      const cached = apiCache.get<T>(cacheKey)
      
      if (cached) {
        return cached
      }

      // Nếu không có trong cache, gọi API
      const data = await queryFn()
      
      // Lưu vào cache
      apiCache.set(cacheKey, data, options?.staleTime)
      
      return data
    },
    enabled: options?.enabled,
    staleTime: options?.staleTime,
    gcTime: options?.cacheTime,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
  })
}

// Hook cho users API
export function useUsers() {
  return useCachedQuery(
    QUERY_KEYS.USERS,
    async () => {
      const { getUsers } = await import('@/api/users')
      return getUsers()
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  )
}

export function useUser(userId: number) {
  return useCachedQuery(
    QUERY_KEYS.USER(userId),
    async () => {
      const { getUsers } = await import('@/api/users')
      const users = await getUsers()
      return users.find(user => user.user_id === userId)
    },
    {
      enabled: !!userId,
      staleTime: 5 * 60 * 1000,
    }
  )
}

// Hook cho datasets API
export function useDatasets() {
  return useCachedQuery(
    QUERY_KEYS.DATASETS,
    async () => {
      const { getDatasets } = await import('@/api/datasets')
      return getDatasets()
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
      cacheTime: 15 * 60 * 1000, // 15 minutes
    }
  )
}

export function useDataset(datasetId: number) {
  return useCachedQuery(
    QUERY_KEYS.DATASET(datasetId),
    async () => {
      const { getDatasets } = await import('@/api/datasets')
      const datasets = await getDatasets()
      return datasets.find(dataset => dataset.dataset_id === datasetId)
    },
    {
      enabled: !!datasetId,
      staleTime: 10 * 60 * 1000,
    }
  )
}

export function useDatasetVersions(datasetId: number) {
  return useCachedQuery(
    QUERY_KEYS.DATASET_VERSIONS(datasetId),
    async () => {
      const { getDatasetVersions } = await import('@/api/datasets')
      return getDatasetVersions(datasetId)
    },
    {
      enabled: !!datasetId,
      staleTime: 5 * 60 * 1000,
    }
  )
}

export function useVersionFiles(versionId: number) {
  return useCachedQuery(
    QUERY_KEYS.VERSION_FILES(versionId),
    async () => {
      const { getVersionFiles } = await import('@/api/datasets')
      return getVersionFiles(versionId)
    },
    {
      enabled: !!versionId,
      staleTime: 5 * 60 * 1000,
    }
  )
}

export function useFilePreview(fileId: number) {
  return useCachedQuery(
    QUERY_KEYS.FILE_PREVIEW(fileId),
    async () => {
      const { getFilePreview } = await import('@/api/datasets')
      return getFilePreview(fileId)
    },
    {
      enabled: !!fileId,
      staleTime: 10 * 60 * 1000, // File previews cache lâu hơn
    }
  )
}

// Mutation hooks với cache invalidation
export function useCreateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (payload: { username: string; email: string; password: string; role_id: number }) => {
      const { createUser } = await import('@/api/users')
      return createUser(payload)
    },
    onSuccess: () => {
      // Invalidate users cache
      queryInvalidation.invalidateUsers()
      apiCache.delete(CACHE_KEYS.USERS)
      toast({ title: 'Add user successfully' })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, payload }: { userId: number; payload: any }) => {
      const { updateUser } = await import('@/api/users')
      return updateUser(userId, payload)
    },
    onSuccess: (_, { userId }) => {
      // Invalidate specific user and users list
      queryInvalidation.invalidateUser(userId)
      queryInvalidation.invalidateUsers()
      cacheUtils.invalidateUser(userId)
      toast({ title: 'Update user successfully' })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userId: number) => {
      const { deleteUser } = await import('@/api/users')
      return deleteUser(userId)
    },
    onSuccess: () => {
      // Invalidate users cache
      queryInvalidation.invalidateUsers()
      toast({ title: 'Delete user successfully' })
    },
  })
}

export function useCreateDataset() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { createDataset } = await import('@/api/datasets')
      return createDataset(name, description)
    },
    onSuccess: () => {
      // Invalidate datasets cache
      queryInvalidation.invalidateDatasets()
      apiCache.delete(CACHE_KEYS.DATASETS)
      toast({ title: 'Add dataset successfully' })
    },
  })
}

export function useDeleteDataset() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (datasetId: number) => {
      const { deleteDataset } = await import('@/api/datasets')
      return deleteDataset(datasetId)
    },
    onSuccess: (_, datasetId) => {
      // Invalidate datasets and related caches
      queryInvalidation.invalidateDatasets()
      queryInvalidation.invalidateDataset(datasetId)
      cacheUtils.invalidateDataset(datasetId)
      toast({ title: 'Delete dataset successfully' })
    },
  })
}

export function useCreateDatasetVersion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ datasetId, changelog }: { datasetId: number; changelog?: string }) => {
      const { createDatasetVersion } = await import('@/api/datasets')
      return createDatasetVersion(datasetId, changelog)
    },
    onSuccess: () => {
      // Invalidate dataset versions cache
      toast({ title: 'Create version successfully' })
    },
  })
}

export function useUploadFile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ versionId, file, fileType }: { versionId: number; file: File; fileType?: string }) => {
      const { uploadFileToVersion } = await import('@/api/datasets')
      return uploadFileToVersion(versionId, file, fileType)
    },
    onSuccess: () => {
      // Invalidate version files cache
      toast({ title: 'Upload file successfully' })
    },
  })
}

// Hook để clear cache khi logout
export function useClearCache() {
  const queryClient = useQueryClient()
  
  return useCallback(() => {
    // Clear React Query cache
    queryClient.clear()
    
    // Clear custom cache
    cacheUtils.clearAllOnLogout()
  }, [queryClient])
}

// Hook để prefetch data
export function usePrefetchData() {
  const queryClient = useQueryClient()
  
  return useCallback(async () => {
    // Prefetch critical data
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.USERS,
        queryFn: async () => {
          const { getUsers } = await import('@/api/users')
          return getUsers()
        },
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.DATASETS,
        queryFn: async () => {
          const { getDatasets } = await import('@/api/datasets')
          return getDatasets()
        },
        staleTime: 5 * 60 * 1000,
      }),
    ])
  }, [queryClient])
}
