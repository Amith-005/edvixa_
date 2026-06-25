import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store'
export function ProtectedRoute() { const user=useAuthStore(s=>s.user); const location=useLocation(); return user?<Outlet/>:<Navigate to="/login" replace state={{from:location.pathname}}/> }
export function RoleRoute({ roles }:{roles:Array<'student'|'teacher'|'admin'>}) { const user=useAuthStore(s=>s.user); if(!user) return <Navigate to="/login" replace/>; return roles.includes(user.role)?<Outlet/>:<Navigate to="/access-denied" replace/> }
