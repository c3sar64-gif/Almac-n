import { createContext, useContext, useState, type ReactNode } from 'react'
import { api, guardarSesion, cerrarSesion, obtenerSesion } from '../api/cliente'
import type { Sesion } from '../api/tipos'

interface Auth {
  sesion: Sesion | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<Auth>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(obtenerSesion() as Sesion | null)

  async function login(email: string, password: string) {
    const s = await api<Sesion>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    guardarSesion(s)
    setSesion(s)
  }

  function logout() {
    cerrarSesion()
    setSesion(null)
  }

  return <AuthContext.Provider value={{ sesion, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
