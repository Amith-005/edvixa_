import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore, type AuthUser } from '../stores/auth.store'

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }
type SessionResponse = { success: true; data: { accessToken: string; user: AuthUser } }

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  timeout: 20_000,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<string | null> | null = null

export function refreshSession(): Promise<string | null> {
  refreshing ??= api
    .post<SessionResponse>('/auth/refresh')
    .then((response) => {
      const { accessToken, user } = response.data.data
      useAuthStore.getState().setSession(accessToken, user)
      return accessToken
    })
    .catch(() => {
      useAuthStore.getState().clearSession()
      return null
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined
    const isRefreshRequest = String(original?.url ?? '').includes('/auth/refresh')

    if (error.response?.status === 401 && original && !original._retry && !isRefreshRequest) {
      original._retry = true
      const token = await refreshSession()
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
    }
    return Promise.reject(error)
  },
)
