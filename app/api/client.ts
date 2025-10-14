import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface RequestOptions {
  method?: HttpMethod
  headers?: Record<string, string>
  body?: unknown
  auth?: boolean
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"

// Create Axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Check if auth is enabled for this request (using custom property)
    if ((config as any).needsAuth !== false && typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem("access_token")
        if (token) {
          config.headers.set('Authorization', `Bearer ${token}`)
        }
      } catch (error) {
        console.warn('Failed to get auth token:', error)
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for success and error handling
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Handle success responses (optional)
    if (typeof window !== "undefined") {
      // Show success toast for certain operations
      const method = response.config.method?.toUpperCase()
      const url = response.config.url || ''
      
      // Only show success toast for POST, PUT, DELETE operations
      if (method && ['POST', 'PUT', 'DELETE'].includes(method)) {
        // Don't show toast for auth endpoints to avoid spam
        if (!url.includes('/auth/')) {
          // Import toast dynamically
          import("@/hooks/use-toast").then(({ toast }) => {
            const action = method === 'POST' ? 'created' : 
                          method === 'PUT' ? 'updated' : 'deleted'
            
            toast({
              title: "Success: Operation completed successfully",
              variant: "default"
            })
          })
        }
      }
    }
    
    return response
  },
  async (error) => {
    // Handle errors with unified toast (client-side only)
    if (typeof window !== "undefined") {
      const { toast } = await import("@/hooks/use-toast")
      
      // Extract error details
      const status = error.response?.status
      const errorData = error.response?.data
      const errorMessage = errorData?.detail || errorData?.message || error.message
      
      // Handle different status codes
      switch (status) {
        case 400:
          toast({ 
            title: `Bad Request: ${errorMessage || "Invalid request data"}`,
            variant: "destructive" 
          })
          break
          
        case 401:
          toast({ 
            title: `Unauthorized: ${errorMessage || "Please login again"}`,
            variant: "destructive" 
          })
          // Optional: Redirect to login page
          // window.location.href = '/login'
          break
          
        case 403:
          toast({ 
            title: `Forbidden: ${errorMessage || "You don't have permission to perform this action"}`,
            variant: "destructive" 
          })
          break
          
        case 404:
          toast({ 
            title: `Not Found: ${errorMessage || "Resource not found"}`,
            variant: "destructive" 
          })
          break
          
        case 422:
          toast({ 
            title: `Validation Error: ${errorMessage || "Please check your input data"}`,
            variant: "destructive" 
          })
          break
          
        case 429:
          toast({ 
            title: `Too Many Requests: ${errorMessage || "Please try again later"}`,
            variant: "destructive" 
          })
          break
          
        case 500:
          toast({ 
            title: `Server Error: ${errorMessage || "Something went wrong on our end"}`,
            variant: "destructive" 
          })
          break
          
        case 502:
        case 503:
        case 504:
          toast({ 
            title: `Service Unavailable: ${errorMessage || "Service is temporarily unavailable"}`,
            variant: "destructive" 
          })
          break
          
        default:
          // Network errors or other issues
          if (!status) {
            toast({ 
              title: "Network Error: Please check your internet connection",
              variant: "destructive" 
            })
          } else {
            toast({ 
              title: `Error: ${errorMessage || `Request failed with status ${status}`}`,
              variant: "destructive" 
            })
          }
      }
    }
    return Promise.reject(error)
  }
)

export async function apiRequest<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", headers = {}, body, auth = false } = options

  const config: any = {
    method: method.toLowerCase(),
    url: path,
    headers,
    data: body,
    needsAuth: auth, // Custom property to indicate if auth is needed
  }

  try {
    const response = await axiosInstance(config)
    return response.data
  } catch (error: any) {
    // Re-throw with consistent error format
    const errorMessage = error.response?.data?.detail || error.message || `Request failed: ${error.response?.status}`
    throw new Error(errorMessage)
  }
}


