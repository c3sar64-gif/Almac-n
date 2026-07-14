const CLAVE_SESION = 'almacen.sesion'

export function obtenerSesion(): { token: string; nombre: string; rol: string } | null {
  const raw = localStorage.getItem(CLAVE_SESION)
  return raw ? JSON.parse(raw) : null
}

export function guardarSesion(s: { token: string; nombre: string; rol: string }) {
  localStorage.setItem(CLAVE_SESION, JSON.stringify(s))
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_SESION)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, mensaje: string) {
    super(mensaje)
    this.status = status
  }
}

export async function api<T>(ruta: string, init?: RequestInit): Promise<T> {
  const sesion = obtenerSesion()
  const res = await fetch(ruta, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(sesion ? { Authorization: `Bearer ${sesion.token}` } : {}),
      ...init?.headers,
    },
  })
  if (res.status === 401) {
    cerrarSesion()
    window.location.href = '/login'
    throw new ApiError(401, 'Sesión expirada.')
  }
  if (!res.ok) {
    let mensaje = `Error ${res.status}`
    try {
      const cuerpo = await res.json()
      if (cuerpo?.error) mensaje = cuerpo.error
    } catch { /* cuerpo no-JSON */ }
    throw new ApiError(res.status, mensaje)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}
