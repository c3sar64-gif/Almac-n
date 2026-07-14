import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function RutaProtegida() {
  const { sesion } = useAuth()
  return sesion ? <Outlet /> : <Navigate to="/login" replace />
}
