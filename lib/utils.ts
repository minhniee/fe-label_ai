import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely extracts callback_url from current location, avoiding duplicates.
 * 
 * When already on /login page with callback_url, extracts the original callback_url.
 * When on other pages, returns the current URL as callback_url.
 * 
 * Handles nested callback_url cases:
 * - /login?callback_url=http://localhost:3000/login -> extracts to /projects (prevents loop)
 * - /login?callback_url=http://localhost:3000/login?callback_url=/admin -> extracts to /admin
 * - /login?callback_url=/admin/stats -> returns /admin/stats (encoded)
 * 
 * @returns The callback_url string to use for login redirect (already encoded)
 */
export function getLoginCallbackUrl(): string {
  if (typeof window === 'undefined') {
    return encodeURIComponent('/projects')
  }

  const currentUrl = window.location.href
  const url = new URL(currentUrl)
  
  // If already on login page
  if (url.pathname === '/login') {
    const existingCallbackUrl = url.searchParams.get('callback_url')
    
    // If callback_url already exists, extract and return the original (not nested)
    if (existingCallbackUrl) {
      try {
        // Decode to get the original URL
        let decoded = decodeURIComponent(existingCallbackUrl)
        
        // Helper function to check if a URL (absolute or relative) points to /login
        const isLoginPage = (urlStr: string): boolean => {
          try {
            // Try as absolute URL first
            const parsed = new URL(urlStr)
            return parsed.pathname === '/login'
          } catch {
            // If that fails, try as relative path
            if (urlStr.startsWith('/login') || urlStr.startsWith('http') && urlStr.includes('/login')) {
              try {
                const parsed = new URL(urlStr, window.location.origin)
                return parsed.pathname === '/login'
              } catch {
                return false
              }
            }
            return false
          }
        }
        
        // Recursively extract nested callback_url until we find a non-login destination
        let iterations = 0
        const maxIterations = 5 // Prevent infinite loops
        
        while (isLoginPage(decoded) && iterations < maxIterations) {
          iterations++
          
          try {
            // Parse the decoded URL to extract nested callback_url
            const parsedUrl = decoded.startsWith('http')
              ? new URL(decoded)
              : new URL(decoded, window.location.origin)
            
            if (parsedUrl.pathname === '/login') {
              const nestedCallbackUrl = parsedUrl.searchParams.get('callback_url')
              if (nestedCallbackUrl) {
                decoded = decodeURIComponent(nestedCallbackUrl)
                continue
              }
            }
            
            // If we're here, it's a login page without nested callback_url - break loop
            break
          } catch (e) {
            // Failed to parse, break loop
            console.warn('Failed to parse callback_url during extraction:', e)
            break
          }
        }
        
        // After extraction, check if final destination is still a login page
        if (isLoginPage(decoded)) {
          // Prevent infinite loop by redirecting to projects
          return encodeURIComponent('/projects')
        }
        
        // Return the extracted callback_url (re-encode it)
        return encodeURIComponent(decoded)
      } catch (e) {
        console.error('Failed to parse existing callback_url:', e)
        // Fallback to projects if parsing fails
        return encodeURIComponent('/projects')
      }
    }
    
    // On /login but no callback_url, default to projects
    return encodeURIComponent('/projects')
  }
  
  // Not on login page - use current URL as callback, but clean up error params
  url.searchParams.delete('error')
  const cleanUrl = url.toString()
  
  return encodeURIComponent(cleanUrl)
}