import { LoaderCircle } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store'

function SessionLoading() {
  return (
    <div className="system-page" role="status" aria-live="polite">
      <div className="card auth-loading-card">
        <LoaderCircle className="spin" />
        <h2>Restoring your session</h2>
        <p className="muted">Checking your secure sign-in…</p>
      </div>
    </div>
  )
}

export function ProtectedRoute() {
  const user = useAuthStore((state) => state.user)
  const status = useAuthStore((state) => state.status)
  const location = useLocation()
  if (status === 'loading') return <SessionLoading />
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
}

export function RoleRoute({ roles }: { roles: Array<'student' | 'teacher' | 'admin'> }) {
  const user = useAuthStore((state) => state.user)
  const status = useAuthStore((state) => state.status)
  if (status === 'loading') return <SessionLoading />
  if (!user) return <Navigate to="/login" replace />
  return roles.includes(user.role) ? <Outlet /> : <Navigate to="/access-denied" replace />
}
