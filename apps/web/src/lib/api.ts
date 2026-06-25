import axios from 'axios'
import { useAuthStore } from '../stores/auth.store'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1', withCredentials: true })
api.interceptors.request.use((config) => { const token = useAuthStore.getState().accessToken; if (token) config.headers.Authorization = `Bearer ${token}`; return config })
let refreshing: Promise<string | null> | null = null
api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config
  if (error.response?.status === 401 && !original?._retry && !String(original?.url).includes('/auth/refresh')) {
    original._retry = true
    refreshing ??= api.post('/auth/refresh').then((response) => { const token = response.data.data.accessToken as string; useAuthStore.getState().setSession(token, response.data.data.user); return token }).catch(() => { useAuthStore.getState().clearSession(); return null }).finally(() => { refreshing = null })
    const token = await refreshing
    if (token) { original.headers.Authorization = `Bearer ${token}`; return api(original) }
  }
  return Promise.reject(error)
})
