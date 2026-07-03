import { create } from 'zustand'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: 'student' | 'teacher' | 'admin'
  avatar?: string | null
  isEmailVerified?: boolean
  isActive?: boolean
}

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

type State = {
  accessToken: string | null
  user: AuthUser | null
  status: AuthStatus
  setSession: (token: string, user: AuthUser) => void
  clearSession: () => void
}

export const useAuthStore = create<State>((set) => ({
  accessToken: null,
  user: null,
  status: 'loading',
  setSession: (accessToken, user) => set({ accessToken, user, status: 'authenticated' }),
  clearSession: () => set({ accessToken: null, user: null, status: 'anonymous' }),
}))
