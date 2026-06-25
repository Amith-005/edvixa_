import { create } from 'zustand'
import { persist } from 'zustand/middleware'
export type AuthUser = { id: string; name: string; email: string; role: 'student'|'teacher'|'admin'; avatar?: string|null; isEmailVerified?: boolean; isActive?: boolean }
type State = { accessToken: string|null; user: AuthUser|null; setSession: (token:string,user:AuthUser)=>void; clearSession:()=>void }
export const useAuthStore = create<State>()(persist((set)=>({ accessToken:null, user:null, setSession:(accessToken,user)=>set({accessToken,user}), clearSession:()=>set({accessToken:null,user:null}) }), { name:'edvixa-auth' }))
