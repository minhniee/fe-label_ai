import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

// Create a single, configured axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    return config;
  },
  (error) => {
    // Do something with request error
    return Promise.reject(error);
  }
);

// Optional: Add a response interceptor for global error handling
api.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    if (error.response?.status === 401) {
      // Handle unauthorized errors, e.g., by redirecting to the login page
      if (typeof window !== 'undefined') {
        console.error("Unauthorized access - redirecting to login.");
        // To prevent circular dependencies, we don't call logout() here.
        // Instead, we just clear the token and redirect.
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        // window.location.href = '/login'; // This can be aggressive, AuthGuard is better
      }
    }
    return Promise.reject(error);
  }
);

export default api;
