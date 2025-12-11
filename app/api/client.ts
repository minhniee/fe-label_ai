import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { getLoginCallbackUrl } from '@/lib/utils';

// Get API base dynamically at runtime
// This allows building without requiring env variables
function getApiBase(): string {
  // 1) Try NEXT_PUBLIC_API_BASE (can be set at build or runtime)
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE) {
    return process.env.NEXT_PUBLIC_API_BASE;
  }
  // 2) Fallback to window.location.origin (client-side only)
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // 3) Server-side fallback (should not happen for client components)
  return "";
}

// Create a single, configured axios instance
const api: AxiosInstance = axios.create({
  baseURL: getApiBase(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Add a request interceptor to attach the JWT token to every request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Check if running on the client side
    if (typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error("Could not get access token from localStorage", error);
      }
    }
    
    // If the request body is FormData, let the browser set Content-Type automatically
    // Don't override with application/json header
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    // Do something with request error
    return Promise.reject(error);
  }
);

const isAuthPath = (url?: string | null) => {
  if (!url) return false
  return url.includes("/auth/login") || url.includes("/auth/register") || url.includes("/auth/forgot") || url.includes("/auth/verify")
}

// Optional: Add a response interceptor for global error handling
api.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // For auth endpoints (e.g., login), just bubble up the 401 to show proper message
      if (isAuthPath(originalRequest.url)) {
        return Promise.reject(error);
      }

      // Skip refresh for auth endpoints to avoid infinite loop
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
        return handleAuthError();
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
        
        if (!refreshToken) {
          // No refresh token available, redirect to login
          return handleAuthError();
        }

        // Import refreshToken function dynamically to avoid circular dependency
        const { refreshToken: refreshTokenFn } = await import('./auth');
        const tokenResponse = await refreshTokenFn(refreshToken);
        
        // Update the access token in localStorage
        if (typeof window !== 'undefined' && tokenResponse.access_token) {
          localStorage.setItem('access_token', tokenResponse.access_token);
          if (tokenResponse.refresh_token) {
            localStorage.setItem('refresh_token', tokenResponse.refresh_token);
          }
        }

        // Update the original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${tokenResponse.access_token}`;
        }

        // Process queued requests
        processQueue(null, tokenResponse.access_token);

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        processQueue(refreshError, null);
        return handleAuthError();
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

function handleAuthError() {
  // Handle unauthorized errors by redirecting to the login page with a callback URL
  if (typeof window !== 'undefined') {
    console.error("Unauthorized access - redirecting to login.");

    // 1. Clear expired tokens and user data
    try {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('picture');
        localStorage.removeItem('user_picture');
    } catch (e) {
        console.error("Failed to clear auth tokens from storage:", e);
    }

    // 2. Get callback URL using utility function to avoid duplicates
    const encodedCallbackUrl = getLoginCallbackUrl();

    // 3. Redirect to login page with the callback_url
    window.location.href = `/login?callback_url=${encodedCallbackUrl}`;
  }
  return Promise.reject(new Error('Unauthorized'));
}

export default api;
