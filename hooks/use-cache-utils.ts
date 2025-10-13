/**
 * Cache utility hooks
 * Các hooks tiện ích cho việc quản lý cache
 */

import { useCallback, useEffect, useState } from 'react'
import { apiCache, userCache, datasetCache, fileCache, cacheUtils, CACHE_KEYS } from '@/lib/cache'
import { queryInvalidation } from '@/lib/query-client'

// Hook để quản lý cache statistics
export function useCacheStats() {
  const [stats, setStats] = useState(() => ({
    api: apiCache.getStats(),
    user: userCache.getStats(),
    dataset: datasetCache.getStats(),
    file: fileCache.getStats(),
  }))

  const refreshStats = useCallback(() => {
    setStats({
      api: apiCache.getStats(),
      user: userCache.getStats(),
      dataset: datasetCache.getStats(),
      file: fileCache.getStats(),
    })
  }, [])

  useEffect(() => {
    // Refresh stats every 30 seconds
    const interval = setInterval(refreshStats, 30000)
    return () => clearInterval(interval)
  }, [refreshStats])

  return { stats, refreshStats }
}

// Hook để clear cache theo pattern
export function useCacheClear() {
  const clearByPattern = useCallback((pattern: string) => {
    apiCache.clearPattern(pattern)
    userCache.clearPattern(pattern)
    datasetCache.clearPattern(pattern)
    fileCache.clearPattern(pattern)
  }, [])

  const clearAll = useCallback(() => {
    apiCache.clear()
    userCache.clear()
    datasetCache.clear()
    fileCache.clear()
    queryInvalidation.clearAll()
  }, [])

  const clearUserData = useCallback(() => {
    userCache.clear()
    apiCache.clearPattern('user.*')
    queryInvalidation.invalidateUsers()
  }, [])

  const clearDatasetData = useCallback(() => {
    datasetCache.clear()
    apiCache.clearPattern('dataset.*')
    queryInvalidation.invalidateDatasets()
  }, [])

  const clearFileData = useCallback(() => {
    fileCache.clear()
    apiCache.clearPattern('file.*')
  }, [])

  return {
    clearByPattern,
    clearAll,
    clearUserData,
    clearDatasetData,
    clearFileData,
  }
}

// Hook để quản lý cache cho user preferences
export function useUserPreferences() {
  const [preferences, setPreferences] = useState(() => {
    try {
      const cached = userCache.get(CACHE_KEYS.PREFERENCES)
      return cached || {
        theme: 'light',
        language: 'en',
        notifications: true,
        autoSave: true,
        pageSize: 10,
      }
    } catch {
      return {
        theme: 'light',
        language: 'en',
        notifications: true,
        autoSave: true,
        pageSize: 10,
      }
    }
  })

  const updatePreferences = useCallback((newPreferences: Partial<typeof preferences>) => {
    const updated = { ...preferences, ...newPreferences }
    setPreferences(updated)
    userCache.set(CACHE_KEYS.PREFERENCES, updated, 24 * 60 * 60 * 1000) // 24 hours
  }, [preferences])

  const resetPreferences = useCallback(() => {
    const defaultPrefs = {
      theme: 'light',
      language: 'en',
      notifications: true,
      autoSave: true,
      pageSize: 10,
    }
    setPreferences(defaultPrefs)
    userCache.set(CACHE_KEYS.PREFERENCES, defaultPrefs, 24 * 60 * 60 * 1000)
  }, [])

  return {
    preferences,
    updatePreferences,
    resetPreferences,
  }
}

// Hook để quản lý cache cho theme
export function useThemeCache() {
  const [theme, setTheme] = useState(() => {
    try {
      const cached = userCache.get(CACHE_KEYS.THEME)
      return cached || 'light'
    } catch {
      return 'light'
    }
  })

  const updateTheme = useCallback((newTheme: string) => {
    setTheme(newTheme)
    userCache.set(CACHE_KEYS.THEME, newTheme, 24 * 60 * 60 * 1000) // 24 hours
  }, [])

  return { theme, updateTheme }
}

// Hook để quản lý cache cho auth token
export function useAuthCache() {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('access_token')
    } catch {
      return null
    }
  })

  const setAuthToken = useCallback((newToken: string | null) => {
    setToken(newToken)
    if (newToken) {
      localStorage.setItem('access_token', newToken)
      userCache.set(CACHE_KEYS.AUTH_TOKEN, newToken, 24 * 60 * 60 * 1000) // 24 hours
    } else {
      localStorage.removeItem('access_token')
      userCache.delete(CACHE_KEYS.AUTH_TOKEN)
    }
  }, [])

  const clearAuth = useCallback(() => {
    setToken(null)
    localStorage.removeItem('access_token')
    userCache.delete(CACHE_KEYS.AUTH_TOKEN)
    // Clear all user-related cache
    cacheUtils.clearAllOnLogout()
  }, [])

  return { token, setAuthToken, clearAuth }
}

// Hook để quản lý cache cho offline mode
export function useOfflineCache() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined') {
      return navigator.onLine
    }
    return true
  })

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const getOfflineData = useCallback((key: string) => {
    return apiCache.get(key)
  }, [])

  const setOfflineData = useCallback((key: string, data: any) => {
    apiCache.set(key, data, 60 * 60 * 1000) // 1 hour for offline data
  }, [])

  return {
    isOnline,
    getOfflineData,
    setOfflineData,
  }
}

// Hook để quản lý cache cho search history
export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const cached = userCache.get<string[]>('search_history')
      return cached || []
    } catch {
      return []
    }
  })

  const addSearch = useCallback((query: string) => {
    if (!query.trim()) return
    
    const updated = [query, ...searchHistory.filter(item => item !== query)].slice(0, 10) // Keep last 10
    setSearchHistory(updated)
    userCache.set('search_history', updated, 7 * 24 * 60 * 60 * 1000) // 7 days
  }, [searchHistory])

  const clearHistory = useCallback(() => {
    setSearchHistory([])
    userCache.delete('search_history')
  }, [])

  return {
    searchHistory,
    addSearch,
    clearHistory,
  }
}

// Hook để quản lý cache cho recent items
export function useRecentItems() {
  const [recentItems, setRecentItems] = useState<Array<{ id: number; type: string; name: string; timestamp: number }>>(() => {
    try {
      const cached = userCache.get<Array<{ id: number; type: string; name: string; timestamp: number }>>('recent_items')
      return cached || []
    } catch {
      return []
    }
  })

  const addRecentItem = useCallback((item: { id: number; type: string; name: string; timestamp: number }) => {
    const updated = [item, ...recentItems.filter(i => !(i.id === item.id && i.type === item.type))].slice(0, 20) // Keep last 20
    setRecentItems(updated)
    userCache.set('recent_items', updated, 7 * 24 * 60 * 60 * 1000) // 7 days
  }, [recentItems])

  const clearRecentItems = useCallback(() => {
    setRecentItems([])
    userCache.delete('recent_items')
  }, [])

  return {
    recentItems,
    addRecentItem,
    clearRecentItems,
  }
}
