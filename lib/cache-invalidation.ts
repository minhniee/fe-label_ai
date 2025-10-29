/**
 * Cache Invalidation Strategies
 * Các chiến lược invalidation cache thông minh
 */

import { apiCache, userCache, datasetCache, fileCache, CACHE_KEYS } from './cache'
import { queryInvalidation } from './query-client'

export interface InvalidationRule {
  pattern: string
  action: 'invalidate' | 'clear' | 'update'
  dependencies?: string[]
  conditions?: (context: any) => boolean
}

export class CacheInvalidationManager {
  private rules: InvalidationRule[] = []

  constructor() {
    this.setupDefaultRules()
  }

  private setupDefaultRules() {
    // User-related invalidation rules
    this.addRule({
      pattern: 'user.*',
      action: 'invalidate',
      dependencies: ['users', 'user_profile'],
      conditions: (context) => context.type === 'user_update'
    })

    // Dataset-related invalidation rules
    this.addRule({
      pattern: 'dataset.*',
      action: 'invalidate',
      dependencies: ['datasets'],
      conditions: (context) => context.type === 'dataset_update'
    })

    // File-related invalidation rules
    this.addRule({
      pattern: 'file.*',
      action: 'invalidate',
      dependencies: ['version_files'],
      conditions: (context) => context.type === 'file_upload'
    })

    // Batch-related invalidation rules
    this.addRule({
      pattern: 'batch.*',
      action: 'invalidate',
      dependencies: ['batches', 'annotations'],
      conditions: (context) => context.type === 'batch_update'
    })

    // Annotation-related invalidation rules
    this.addRule({
      pattern: 'annotation.*',
      action: 'invalidate',
      dependencies: ['annotations', 'stats'],
      conditions: (context) => context.type === 'annotation_update'
    })
  }

  addRule(rule: InvalidationRule) {
    this.rules.push(rule)
  }

  /**
   * Invalidate cache based on context
   */
  invalidate(context: {
    type: string
    entityId?: number
    entityType?: string
    userId?: number
    datasetId?: number
    batchId?: number
    [key: string]: any
  }) {
    const applicableRules = this.rules.filter(rule => {
      if (rule.conditions && !rule.conditions(context)) {
        return false
      }
      return true
    })

    for (const rule of applicableRules) {
      this.executeRule(rule, context)
    }
  }

  private executeRule(rule: InvalidationRule, context: any) {
    switch (rule.action) {
      case 'invalidate':
        this.invalidateByPattern(rule.pattern, context)
        break
      case 'clear':
        this.clearByPattern(rule.pattern, context)
        break
      case 'update':
        this.updateByPattern(rule.pattern, context)
        break
    }

    // Invalidate React Query cache
    if (rule.dependencies) {
      rule.dependencies.forEach(dep => {
        this.invalidateReactQuery(dep, context)
      })
    }
  }

  private invalidateByPattern(pattern: string, context: any) {
    const regex = new RegExp(pattern.replace('*', '.*'))
    
    // Invalidate custom caches
    apiCache.clearPattern(pattern)
    userCache.clearPattern(pattern)
    datasetCache.clearPattern(pattern)
    fileCache.clearPattern(pattern)
  }

  private clearByPattern(pattern: string, context: any) {
    // Clear all caches matching pattern
    apiCache.clearPattern(pattern)
    userCache.clearPattern(pattern)
    datasetCache.clearPattern(pattern)
    fileCache.clearPattern(pattern)
  }

  private updateByPattern(pattern: string, context: any) {
    // Update cache with new data
    // This would be implemented based on specific needs
    console.log(`Updating cache for pattern: ${pattern}`, context)
  }

  private invalidateReactQuery(dependency: string, context: any) {
    switch (dependency) {
      case 'users':
        queryInvalidation.invalidateUsers()
        break
      case 'user_profile':
        queryInvalidation.invalidateUser(context.userId || 0)
        break
      case 'datasets':
        queryInvalidation.invalidateDatasets()
        break
      case 'dataset':
        if (context.datasetId) {
          queryInvalidation.invalidateDataset(context.datasetId)
        }
        break
      case 'version_files':
        if (context.versionId) {
          queryInvalidation.invalidateVersionFiles(context.versionId)
        }
        break
      case 'batches':
        queryInvalidation.invalidateBatches()
        break
      case 'batch':
        if (context.batchId) {
          queryInvalidation.invalidateBatch(context.batchId)
        }
        break
      case 'annotations':
        queryInvalidation.invalidateAnnotations()
        break
      case 'stats':
        queryInvalidation.invalidateStats()
        break
    }
  }
}

// Global cache invalidation manager
export const cacheInvalidationManager = new CacheInvalidationManager()

// Specific invalidation functions
export const invalidationStrategies = {
  /**
   * Invalidate when user data changes
   */
  onUserChange: (userId: number, changeType: 'create' | 'update' | 'delete') => {
    cacheInvalidationManager.invalidate({
      type: 'user_update',
      userId,
      changeType
    })
  },

  /**
   * Invalidate when dataset data changes
   */
  onDatasetChange: (datasetId: number, changeType: 'create' | 'update' | 'delete') => {
    cacheInvalidationManager.invalidate({
      type: 'dataset_update',
      datasetId,
      changeType
    })
  },

  /**
   * Invalidate when file is uploaded
   */
  onFileUpload: (versionId: number, fileId: number) => {
    cacheInvalidationManager.invalidate({
      type: 'file_upload',
      versionId,
      fileId
    })
  },

  /**
   * Invalidate when batch data changes
   */
  onBatchChange: (batchId: number, changeType: 'create' | 'update' | 'delete') => {
    cacheInvalidationManager.invalidate({
      type: 'batch_update',
      batchId,
      changeType
    })
  },

  /**
   * Invalidate when annotation data changes
   */
  onAnnotationChange: (annotationId: number, batchId: number, userId: number) => {
    cacheInvalidationManager.invalidate({
      type: 'annotation_update',
      annotationId,
      batchId,
      userId
    })
  },

  /**
   * Invalidate when user logs out
   */
  onUserLogout: (userId: number) => {
    // Clear all user-related cache
    userCache.clear()
    apiCache.clearPattern('user.*')
    queryInvalidation.clearAll()
  },

  /**
   * Invalidate when user logs in
   */
  onUserLogin: (userId: number) => {
    // Clear old cache and prefetch user data
    cacheInvalidationManager.invalidate({
      type: 'user_login',
      userId
    })
  },

  /**
   * Invalidate when data is refreshed
   */
  onDataRefresh: (entityType: string, entityId?: number) => {
    cacheInvalidationManager.invalidate({
      type: 'data_refresh',
      entityType,
      entityId
    })
  },

  /**
   * Invalidate when permissions change
   */
  onPermissionChange: (userId: number, newRole: string) => {
    cacheInvalidationManager.invalidate({
      type: 'permission_change',
      userId,
      newRole
    })
  },

  /**
   * Smart invalidation based on data relationships
   */
  smartInvalidate: (context: {
    entityType: string
    entityId: number
    action: string
    relatedEntities?: Array<{ type: string; id: number }>
  }) => {
    // Invalidate the main entity
    cacheInvalidationManager.invalidate({
      type: `${context.entityType}_${context.action}`,
      [`${context.entityType}Id`]: context.entityId
    })

    // Invalidate related entities
    if (context.relatedEntities) {
      context.relatedEntities.forEach(related => {
        cacheInvalidationManager.invalidate({
          type: `${related.type}_related_update`,
          [`${related.type}Id`]: related.id,
          sourceEntityType: context.entityType,
          sourceEntityId: context.entityId
        })
      })
    }
  }
}

// Time-based invalidation
export const timeBasedInvalidation = {
  /**
   * Schedule cache invalidation after a certain time
   */
  scheduleInvalidation: (key: string, delay: number) => {
    setTimeout(() => {
      apiCache.delete(key)
      userCache.delete(key)
      datasetCache.delete(key)
      fileCache.delete(key)
    }, delay)
  },

  /**
   * Invalidate cache at specific intervals
   */
  setIntervalInvalidation: (pattern: string, interval: number) => {
    return setInterval(() => {
      apiCache.clearPattern(pattern)
      userCache.clearPattern(pattern)
      datasetCache.clearPattern(pattern)
      fileCache.clearPattern(pattern)
    }, interval)
  },

  /**
   * Invalidate cache at specific times
   */
  scheduleDailyInvalidation: (pattern: string, hour: number = 0) => {
    const now = new Date()
    const targetTime = new Date()
    targetTime.setHours(hour, 0, 0, 0)
    
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1)
    }
    
    const delay = targetTime.getTime() - now.getTime()
    
    setTimeout(() => {
      apiCache.clearPattern(pattern)
      userCache.clearPattern(pattern)
      datasetCache.clearPattern(pattern)
      fileCache.clearPattern(pattern)
      
      // Schedule next day
      timeBasedInvalidation.scheduleDailyInvalidation(pattern, hour)
    }, delay)
  }
}

// Cache warming strategies
export const cacheWarming = {
  /**
   * Warm cache with frequently accessed data
   */
  warmFrequentData: async () => {
    try {
      // Prefetch users
      const { getUsers } = await import('@/app/api/users')
      const users = await getUsers()
      apiCache.set(CACHE_KEYS.USERS, users, 5 * 60 * 1000)

      // Prefetch datasets
      const { getDatasets } = await import('@/app/api/datasets')
      const datasets = await getDatasets()
      apiCache.set(CACHE_KEYS.DATASETS, datasets, 10 * 60 * 1000)
    } catch (error) {
      console.warn('Failed to warm cache:', error)
    }
  },

  /**
   * Warm cache for specific user
   */
  warmUserData: async (userId: number) => {
    try {
      // This would prefetch user-specific data
      console.log(`Warming cache for user ${userId}`)
    } catch (error) {
      console.warn('Failed to warm user cache:', error)
    }
  }
}
