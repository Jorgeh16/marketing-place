import axios from 'axios'
import { queryClient } from './query-client'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !['/auth/login', '/auth/register'].includes(error.config?.url ?? '') &&
      localStorage.getItem('auth-token')
    ) {
      localStorage.removeItem('auth-token')
      queryClient.clear()
      window.dispatchEvent(new CustomEvent('auth:changed', { detail: { userId: null } }))
      window.dispatchEvent(new Event('session:expired'))
    }
    return Promise.reject(error)
  },
)
