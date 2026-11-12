import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

/**
 * Central Axios instance for GymVIP API
 */
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Request Interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Check if token exists in localStorage/sessionStorage if needed for future API token auth
    const token = typeof window !== 'undefined' ? localStorage.getItem('gymvip_token') : null
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError) => {
    // Handle unauthorized globally (session expired / revoked cookie)
    if (error.response?.status === 401) {
      console.warn('جلسة العمل منتهية الصلاحية (401)')
    }
    return Promise.reject(error)
  }
)

export default api
