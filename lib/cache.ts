export interface CacheConfig {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of items in cache
  storage?: 'localStorage' | 'memory' | 'both'
}

export interface CacheItem<T = any> {
  data: T
  timestamp: number
  ttl: number
  key: string
}

export class CacheService {
  private memoryCache = new Map<string, CacheItem>()
  private config: Required<CacheConfig>
  private readonly STORAGE_PREFIX = 'tagmify_cache_'

  constructor(config: CacheConfig = {}) {
    this.config = {
      ttl: config.ttl || 5 * 60 * 1000, // 5 minutes default
      maxSize: config.maxSize || 100,
      storage: config.storage || 'both'
    }
  }

  /**
   * Lưu dữ liệu vào cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.ttl,
      key
    }

    // Memory cache
    if (this.config.storage === 'memory' || this.config.storage === 'both') {
      this.memoryCache.set(key, cacheItem)
      this.enforceMaxSize()
    }

    // LocalStorage cache
    if (this.config.storage === 'localStorage' || this.config.storage === 'both') {
      try {
        localStorage.setItem(
          `${this.STORAGE_PREFIX}${key}`,
          JSON.stringify(cacheItem)
        )
      } catch (error) {
        console.warn('Failed to save to localStorage:', error)
      }
    }
  }

  /**
   * Lấy dữ liệu từ cache
   */
  get<T>(key: string): T | null {
    // Thử memory cache trước
    if (this.config.storage === 'memory' || this.config.storage === 'both') {
      const memoryItem = this.memoryCache.get(key)
      if (memoryItem && !this.isExpired(memoryItem)) {
        return memoryItem.data
      }
      if (memoryItem && this.isExpired(memoryItem)) {
        this.memoryCache.delete(key)
      }
    }

    // Thử localStorage cache
    if (this.config.storage === 'localStorage' || this.config.storage === 'both') {
      try {
        const stored = localStorage.getItem(`${this.STORAGE_PREFIX}${key}`)
        if (stored) {
          const item: CacheItem<T> = JSON.parse(stored)
          if (!this.isExpired(item)) {
            // Đồng bộ lại memory cache nếu cần
            if (this.config.storage === 'both') {
              this.memoryCache.set(key, item)
            }
            return item.data
          } else {
            // Xóa item đã hết hạn
            localStorage.removeItem(`${this.STORAGE_PREFIX}${key}`)
          }
        }
      } catch (error) {
        console.warn('Failed to read from localStorage:', error)
      }
    }

    return null
  }

  /**
   * Kiểm tra xem item có tồn tại và chưa hết hạn không
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Xóa item khỏi cache
   */
  delete(key: string): void {
    // Xóa khỏi memory
    if (this.config.storage === 'memory' || this.config.storage === 'both') {
      this.memoryCache.delete(key)
    }

    // Xóa khỏi localStorage
    if (this.config.storage === 'localStorage' || this.config.storage === 'both') {
      try {
        localStorage.removeItem(`${this.STORAGE_PREFIX}${key}`)
      } catch (error) {
        console.warn('Failed to delete from localStorage:', error)
      }
    }
  }

  /**
   * Xóa tất cả cache
   */
  clear(): void {
    // Xóa memory cache
    if (this.config.storage === 'memory' || this.config.storage === 'both') {
      this.memoryCache.clear()
    }

    // Xóa localStorage cache
    if (this.config.storage === 'localStorage' || this.config.storage === 'both') {
      try {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith(this.STORAGE_PREFIX)) {
            localStorage.removeItem(key)
          }
        })
      } catch (error) {
        console.warn('Failed to clear localStorage:', error)
      }
    }
  }

  /**
   * Xóa cache theo pattern
   */
  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern)

    // Xóa memory cache
    if (this.config.storage === 'memory' || this.config.storage === 'both') {
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key)
        }
      }
    }

    // Xóa localStorage cache
    if (this.config.storage === 'localStorage' || this.config.storage === 'both') {
      try {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith(this.STORAGE_PREFIX)) {
            const cacheKey = key.replace(this.STORAGE_PREFIX, '')
            if (regex.test(cacheKey)) {
              localStorage.removeItem(key)
            }
          }
        })
      } catch (error) {
        console.warn('Failed to clear pattern from localStorage:', error)
      }
    }
  }

  /**
   * Lấy thống kê cache
   */
  getStats() {
    const memorySize = this.memoryCache.size
    let localStorageSize = 0

    try {
      const keys = Object.keys(localStorage)
      localStorageSize = keys.filter(key => key.startsWith(this.STORAGE_PREFIX)).length
    } catch (error) {
      console.warn('Failed to get localStorage stats:', error)
    }

    return {
      memory: {
        size: memorySize,
        maxSize: this.config.maxSize
      },
      localStorage: {
        size: localStorageSize
      },
      config: this.config
    }
  }

  /**
   * Kiểm tra xem item có hết hạn không
   */
  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > item.ttl
  }

  /**
   * Đảm bảo không vượt quá maxSize
   */
  private enforceMaxSize(): void {
    if (this.memoryCache.size > this.config.maxSize) {
      const entries = Array.from(this.memoryCache.entries())
      // Sắp xếp theo timestamp, xóa những item cũ nhất
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      const toDelete = entries.slice(0, this.memoryCache.size - this.config.maxSize)
      toDelete.forEach(([key]) => this.memoryCache.delete(key))
    }
  }
}

// Cache instances cho các mục đích khác nhau
export const apiCache = new CacheService({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 50,
  storage: 'both'
})

export const userCache = new CacheService({
  ttl: 10 * 60 * 1000, // 10 minutes
  maxSize: 20,
  storage: 'both'
})

export const datasetCache = new CacheService({
  ttl: 15 * 60 * 1000, // 15 minutes
  maxSize: 30,
  storage: 'both'
})

export const fileCache = new CacheService({
  ttl: 30 * 60 * 1000, // 30 minutes
  maxSize: 100,
  storage: 'both'
})

// Cache keys constants
export const CACHE_KEYS = {
  USERS: 'users',
  DATASETS: 'datasets',
  DATASET_VERSIONS: (datasetId: number) => `dataset_${datasetId}_versions`,
  DATASET_FILES: (versionId: number) => `version_${versionId}_files`,
  FILE_PREVIEW: (fileId: number) => `file_${fileId}_preview`,
  USER_PROFILE: 'user_profile',
  AUTH_TOKEN: 'auth_token',
  THEME: 'theme',
  PREFERENCES: 'preferences'
} as const

// Utility functions
export const cacheUtils = {
  /**
   * Tạo cache key với prefix
   */
  createKey: (prefix: string, ...parts: (string | number)[]): string => {
    return [prefix, ...parts].join('_')
  },

  /**
   * Xóa cache liên quan đến dataset
   */
  invalidateDataset: (datasetId: number) => {
    datasetCache.delete(CACHE_KEYS.DATASETS)
    datasetCache.clearPattern(`dataset_${datasetId}_.*`)
  },

  /**
   * Xóa cache liên quan đến user
   */
  invalidateUser: (userId: number) => {
    userCache.delete(CACHE_KEYS.USERS)
    userCache.delete(CACHE_KEYS.USER_PROFILE)
  },

  /**
   * Xóa tất cả cache khi logout
   */
  clearAllOnLogout: () => {
    apiCache.clear()
    userCache.clear()
    datasetCache.clear()
    fileCache.clear()
  }
}
