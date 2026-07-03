import { api } from '../../lib/api'

export async function getAdminData<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const response = await api.get<{ success: true; data: T }>(path, { params })
  return response.data.data
}

export async function patchAdminData<T>(path: string, body: unknown): Promise<T> {
  const response = await api.patch<{ success: true; data: T }>(path, body)
  return response.data.data
}

export async function postAdminData<T>(path: string, body: unknown): Promise<T> {
  const response = await api.post<{ success: true; data: T }>(path, body)
  return response.data.data
}

export function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value ?? 0)
}

export function formatDate(value: string | Date | null | undefined, withTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date)
}

export function getApiError(error: unknown, fallback = 'Something went wrong') {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response
    return response?.data?.error?.message ?? fallback
  }
  return fallback
}
