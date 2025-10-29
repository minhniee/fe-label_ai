/**
 * React Query Client Configuration
 * Cấu hình cho server state caching với React Query
 */

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache time: 5 minutes
      staleTime: 5 * 60 * 1000,
      // Background refetch time: 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Refetch on mount if data is stale
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
})

// Query keys constants
export const QUERY_KEYS = {
  // Users
  USERS: ['users'] as const,
  USER: (id: number) => ['users', id] as const,
  USER_PROFILE: ['user', 'profile'] as const,
  
  // Datasets
  DATASETS: ['datasets'] as const,
  DATASET: (id: number) => ['datasets', id] as const,
  DATASET_VERSIONS: (datasetId: number) => ['datasets', datasetId, 'versions'] as const,
  DATASET_VERSION: (datasetId: number, versionId: number) => 
    ['datasets', datasetId, 'versions', versionId] as const,
  
  // Files
  VERSION_FILES: (versionId: number) => ['versions', versionId, 'files'] as const,
  FILE_PREVIEW: (fileId: number) => ['files', fileId, 'preview'] as const,
  
  // Labels
  LABELS: ['labels'] as const,
  LABEL: (id: number) => ['labels', id] as const,
  
  // Batches
  BATCHES: ['batches'] as const,
  BATCH: (id: number) => ['batches', id] as const,
  BATCH_ASSIGNMENTS: (batchId: number) => ['batches', batchId, 'assignments'] as const,
  
  // Annotations
  ANNOTATIONS: ['annotations'] as const,
  ANNOTATION: (id: number) => ['annotations', id] as const,
  ANNOTATIONS_BY_BATCH: (batchId: number) => ['annotations', 'batch', batchId] as const,
  ANNOTATIONS_BY_USER: (userId: number) => ['annotations', 'user', userId] as const,
  
  // Statistics
  STATS: ['stats'] as const,
  USER_STATS: (userId: number) => ['stats', 'user', userId] as const,
  BATCH_STATS: (batchId: number) => ['stats', 'batch', batchId] as const,
  DATASET_STATS: (datasetId: number) => ['stats', 'dataset', datasetId] as const,
} as const

// Cache invalidation helpers
export const queryInvalidation = {
  // Invalidate all users queries
  invalidateUsers: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS })
  },
  
  // Invalidate specific user
  invalidateUser: (userId: number) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER(userId) })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE })
  },
  
  // Invalidate all datasets queries
  invalidateDatasets: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DATASETS })
  },
  
  // Invalidate specific dataset and its versions
  invalidateDataset: (datasetId: number) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DATASET(datasetId) })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DATASET_VERSIONS(datasetId) })
  },
  
  // Invalidate dataset versions
  invalidateDatasetVersions: (datasetId: number) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DATASET_VERSIONS(datasetId) })
  },
  
  // Invalidate version files
  invalidateVersionFiles: (versionId: number) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VERSION_FILES(versionId) })
  },
  
  // Invalidate file preview
  invalidateFilePreview: (fileId: number) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FILE_PREVIEW(fileId) })
  },
  
  // Invalidate all labels
  invalidateLabels: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LABELS })
  },
  
  // Invalidate all batches
  invalidateBatches: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BATCHES })
  },
  
  // Invalidate specific batch
  invalidateBatch: (batchId: number) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BATCH(batchId) })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BATCH_ASSIGNMENTS(batchId) })
  },
  
  // Invalidate all annotations
  invalidateAnnotations: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ANNOTATIONS })
  },
  
  // Invalidate annotations by batch
  invalidateAnnotationsByBatch: (batchId: number) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ANNOTATIONS_BY_BATCH(batchId) })
  },
  
  // Invalidate annotations by user
  invalidateAnnotationsByUser: (userId: number) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ANNOTATIONS_BY_USER(userId) })
  },
  
  // Invalidate all statistics
  invalidateStats: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STATS })
  },
  
  // Invalidate user statistics
  invalidateUserStats: (userId: number) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_STATS(userId) })
  },
  
  // Invalidate batch statistics
  invalidateBatchStats: (batchId: number) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BATCH_STATS(batchId) })
  },
  
  // Invalidate dataset statistics
  invalidateDatasetStats: (datasetId: number) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DATASET_STATS(datasetId) })
  },
  
  // Clear all cache (useful for logout)
  clearAll: () => {
    queryClient.clear()
  },
}

// Prefetch helpers
export const queryPrefetch = {
  // Prefetch users list
  prefetchUsers: async () => {
    await queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.USERS,
      queryFn: async () => {
        const { getUsers } = await import('../app/api/users')
        return getUsers()
      },
      staleTime: 5 * 60 * 1000,
    })
  },
  
  // Prefetch datasets list
  prefetchDatasets: async () => {
    await queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.DATASETS,
      queryFn: async () => {
        const { getDatasets } = await import('../app/api/dataset')
        return getDatasets()
      },
      staleTime: 5 * 60 * 1000,
    })
  },
  
  // Prefetch dataset versions
  prefetchDatasetVersions: async (datasetId: number) => {
    await queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.DATASET_VERSIONS(datasetId),
      queryFn: async () => {
        const { getDatasetVersions } = await import('../app/api/dataset')
        return getDatasetVersions(datasetId)
      },
      staleTime: 5 * 60 * 1000,
    })
  },
}
