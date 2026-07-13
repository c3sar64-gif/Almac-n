# Frontend Sistema de Almacenes — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SPA en React + TypeScript que consume la API del backend (`http://localhost:5000`) para gestionar productos, almacenes, existencias, movimientos y reportes, con login JWT.

**Architecture:** Vite + React Router. Un cliente HTTP central (`src/api/cliente.ts`) agrega el token JWT y traduce errores de la API. `AuthContext` guarda sesión en `localStorage`. Una página por módulo bajo `src/paginas/`. Tests de componentes con Vitest + React Testing Library.

**Tech Stack:** React 18, TypeScript, Vite, React Router 6, Vitest, React Testing Library. Sin librería de UI: CSS simple (YAGNI).

**Prerequisito:** el plan del backend (`2026-07-13-almacen-backend.md`) ejecutado; API corriendo en `http://localhost:5000`.

**Directorio de trabajo:** `frontend/`. Shell: PowerShell.

---

### Task 1: Scaffold Vite + React + TypeScript

**Files:**
- Create: `frontend/` (proyecto Vite completo)
- Modify: `frontend/vite.config.ts`

- [ ] **Step 1: Crear el proyecto**

Desde la raíz del repo:
```powershell
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install react-router-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Configurar proxy y tests en vite.config.ts**

Reemplazar `vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:5000' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
})
```

Crear `src/setupTests.ts`:
```ts
import '@testing-library/jest-dom'
```

Agregar a `package.json` en `"scripts"`: `"test": "vitest run"`.

- [ ] **Step 3: Limpiar plantilla y CSS base**

Borrar `src/App.css` y `src/assets/react.svg`. Reemplazar `src/index.css`:
```css
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: #f5f6f8; color: #222; }
main { padding: 1.5rem; max-width: 1100px; margin: 0 auto; }
table { width: 100%; border-collapse: collapse; background: #fff; }
th, td { text-align: left; padding: .5rem .75rem; border-bottom: 1px solid #e3e5e8; }
th { background: #eef0f3; }
form.panel, .panel { background: #fff; padding: 1rem; border: 1px solid #e3e5e8; border-radius: 6px; margin-bottom: 1rem; }
label { display: block; margin-bottom: .5rem; font-size: .9rem; }
input, select { width: 100%; padding: .4rem; margin-top: .2rem; border: 1px solid #c8ccd2; border-radius: 4px; }
button { padding: .45rem .9rem; border: 0; border-radius: 4px; background: #2457a7; color: #fff; cursor: pointer; }
button.secundario { background: #6a7280; }
nav { display: flex; gap: 1rem; padding: .75rem 1.5rem; background: #1d2733; }
nav a { color: #cfd8e3; text-decoration: none; }
nav a.activo { color: #fff; font-weight: 600; }
.error { color: #b3261e; margin: .5rem 0; }
.alerta { color: #b3261e; font-weight: 600; }
```

Reemplazar `src/App.tsx` temporalmente (se completa en Task 3):
```tsx
export default function App() {
  return <p>Sistema de Almacenes</p>
}
```

- [ ] **Step 4: Verificar que arranca y compila**

Run: `npm run build`
Expected: `✓ built in ...` sin errores de TypeScript.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "chore: scaffold frontend Vite + React + TS"
```

---

### Task 2: Tipos y cliente API

**Files:**
- Create: `frontend/src/api/tipos.ts`
- Create: `frontend/src/api/cliente.ts`

- [ ] **Step 1: Tipos que espejan la API**

`src/api/tipos.ts`:
```ts
export interface Producto {
  id: number
  sku: string
  nombre: string
  descripcion?: string | null
  categoria?: string | null
  unidadMedida: string
  activo: boolean
}

export interface Almacen {
  id: number
  nombre: string
  ubicacion?: string | null
  activo: boolean
}

export interface Existencia {
  id: number
  cantidad: number
  stockMinimo: number
  bajoMinimo: boolean
  producto: { id: number; sku: string; nombre: string; unidadMedida: string }
  almacen: { id: number; nombre: string }
}

export interface Movimiento {
  id: number
  tipo: 'Entrada' | 'Salida' | 'Transferencia'
  fecha: string
  cantidad: number
  nota?: string | null
  producto: { id: number; sku: string; nombre: string }
  almacenOrigen?: string | null
  almacenDestino?: string | null
  usuario: string
}

export interface Sesion {
  token: string
  nombre: string
  rol: 'Admin' | 'Operador'
}

export interface UsuarioLista {
  id: number
  email: string
  nombre: string
  rol: string
  activo: boolean
}
```

- [ ] **Step 2: Cliente HTTP con token y errores**

`src/api/cliente.ts`:
```ts
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
  constructor(public status: number, mensaje: string) {
    super(mensaje)
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
```

- [ ] **Step 3: Verificar compilación**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: tipos y cliente API con JWT"
```

---

### Task 3: AuthContext, Login y rutas protegidas (TDD en Login)

**Files:**
- Create: `frontend/src/auth/AuthContext.tsx`
- Create: `frontend/src/paginas/Login.tsx`
- Create: `frontend/src/paginas/Login.test.tsx`
- Create: `frontend/src/componentes/RutaProtegida.tsx`
- Create: `frontend/src/componentes/Layout.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/main.tsx`

- [ ] **Step 1: AuthContext**

`src/auth/AuthContext.tsx`:
```tsx
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
```

- [ ] **Step 2: Test que falla — Login muestra error de credenciales**

`src/paginas/Login.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider } from '../auth/AuthContext'
import Login from './Login'

describe('Login', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('muestra el error que devuelve la API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Credenciales inválidas.' }), { status: 401 }),
    ))
    // Evitar la redirección dura del cliente en 401
    vi.stubGlobal('location', { href: '' })

    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText(/email/i), 'x@x.com')
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'mala')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByText(/sesión expirada|credenciales/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Verificar que falla**

Run: `npm test`
Expected: FAIL — `Login` no existe.

- [ ] **Step 4: Implementar Login**

`src/paginas/Login.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <main style={{ maxWidth: 380, marginTop: '10vh' }}>
      <form className="panel" onSubmit={onSubmit}>
        <h1>Sistema de Almacenes</h1>
        <label>
          Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button disabled={cargando}>{cargando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </main>
  )
}
```

- [ ] **Step 5: Verificar que pasa**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 6: Layout, RutaProtegida y rutas**

`src/componentes/RutaProtegida.tsx`:
```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function RutaProtegida() {
  const { sesion } = useAuth()
  return sesion ? <Outlet /> : <Navigate to="/login" replace />
}
```

`src/componentes/Layout.tsx`:
```tsx
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const enlaces = [
  { a: '/', texto: 'Existencias' },
  { a: '/productos', texto: 'Productos' },
  { a: '/almacenes', texto: 'Almacenes' },
  { a: '/movimientos', texto: 'Movimientos' },
  { a: '/reportes', texto: 'Reportes' },
]

export default function Layout() {
  const { sesion, logout } = useAuth()
  return (
    <>
      <nav>
        {enlaces.map(e => (
          <NavLink key={e.a} to={e.a} end={e.a === '/'}
            className={({ isActive }) => (isActive ? 'activo' : '')}>
            {e.texto}
          </NavLink>
        ))}
        {sesion?.rol === 'Admin' && (
          <NavLink to="/usuarios" className={({ isActive }) => (isActive ? 'activo' : '')}>
            Usuarios
          </NavLink>
        )}
        <span style={{ marginLeft: 'auto', color: '#cfd8e3' }}>
          {sesion?.nombre}{' '}
          <button className="secundario" onClick={logout}>Salir</button>
        </span>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  )
}
```

`src/App.tsx`:
```tsx
import { Route, Routes } from 'react-router-dom'
import Layout from './componentes/Layout'
import RutaProtegida from './componentes/RutaProtegida'
import Login from './paginas/Login'
import Existencias from './paginas/Existencias'
import Productos from './paginas/Productos'
import Almacenes from './paginas/Almacenes'
import Movimientos from './paginas/Movimientos'
import Reportes from './paginas/Reportes'
import Usuarios from './paginas/Usuarios'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Existencias />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/almacenes" element={<Almacenes />} />
          <Route path="/movimientos" element={<Movimientos />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Route>
      </Route>
    </Routes>
  )
}
```

Para que compile ahora, crear cada página pendiente como stub (se implementan en Tasks 4-8). Ejemplo — `src/paginas/Existencias.tsx` (repetir patrón para `Productos.tsx`, `Almacenes.tsx`, `Movimientos.tsx`, `Reportes.tsx`, `Usuarios.tsx` cambiando el nombre):
```tsx
export default function Existencias() {
  return <h1>Existencias</h1>
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 7: Verificar build y test**

Run: `npm run build && npm test`
Expected: build OK, 1 test PASS.

- [ ] **Step 8: Commit**

```powershell
git add -A
git commit -m "feat: login JWT, rutas protegidas y layout"
```

---

### Task 4: Página Productos

**Files:**
- Modify: `frontend/src/paginas/Productos.tsx`

- [ ] **Step 1: Implementar la página (lista + formulario alta/edición)**

Reemplazar `src/paginas/Productos.tsx`:
```tsx
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/cliente'
import type { Producto } from '../api/tipos'

const vacio: Omit<Producto, 'id'> = {
  sku: '', nombre: '', descripcion: '', categoria: '', unidadMedida: 'pieza', activo: true,
}

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [form, setForm] = useState(vacio)
  const [editando, setEditando] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function cargar() {
    setProductos(await api<Producto[]>('/api/productos'))
  }
  useEffect(() => { cargar().catch(e => setError(e.message)) }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      if (editando === null) {
        await api('/api/productos', { method: 'POST', body: JSON.stringify(form) })
      } else {
        await api(`/api/productos/${editando}`, {
          method: 'PUT', body: JSON.stringify({ ...form, id: editando }),
        })
      }
      setForm(vacio)
      setEditando(null)
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.')
    }
  }

  function editar(p: Producto) {
    setEditando(p.id)
    setForm({ sku: p.sku, nombre: p.nombre, descripcion: p.descripcion ?? '',
      categoria: p.categoria ?? '', unidadMedida: p.unidadMedida, activo: p.activo })
  }

  return (
    <>
      <h1>Productos</h1>
      <form className="panel" onSubmit={onSubmit}>
        <h2>{editando === null ? 'Nuevo producto' : 'Editar producto'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.75rem' }}>
          <label>SKU
            <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} required />
          </label>
          <label>Nombre
            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
          </label>
          <label>Categoría
            <input value={form.categoria ?? ''} onChange={e => setForm({ ...form, categoria: e.target.value })} />
          </label>
          <label>Descripción
            <input value={form.descripcion ?? ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
          </label>
          <label>Unidad de medida
            <input value={form.unidadMedida} onChange={e => setForm({ ...form, unidadMedida: e.target.value })} required />
          </label>
          <label>Activo
            <select value={String(form.activo)} onChange={e => setForm({ ...form, activo: e.target.value === 'true' })}>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <button>{editando === null ? 'Crear' : 'Guardar cambios'}</button>{' '}
        {editando !== null && (
          <button type="button" className="secundario"
            onClick={() => { setEditando(null); setForm(vacio) }}>
            Cancelar
          </button>
        )}
      </form>
      <table>
        <thead>
          <tr><th>SKU</th><th>Nombre</th><th>Categoría</th><th>Unidad</th><th>Activo</th><th></th></tr>
        </thead>
        <tbody>
          {productos.map(p => (
            <tr key={p.id}>
              <td>{p.sku}</td><td>{p.nombre}</td><td>{p.categoria}</td>
              <td>{p.unidadMedida}</td><td>{p.activo ? 'Sí' : 'No'}</td>
              <td><button type="button" onClick={() => editar(p)}>Editar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "feat: pagina de productos"
```

---

### Task 5: Página Almacenes

**Files:**
- Modify: `frontend/src/paginas/Almacenes.tsx`

- [ ] **Step 1: Implementar la página**

Reemplazar `src/paginas/Almacenes.tsx` (mismo patrón que Productos, solo Admin ve el formulario):
```tsx
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/cliente'
import type { Almacen } from '../api/tipos'
import { useAuth } from '../auth/AuthContext'

const vacio = { nombre: '', ubicacion: '', activo: true }

export default function Almacenes() {
  const { sesion } = useAuth()
  const esAdmin = sesion?.rol === 'Admin'
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [form, setForm] = useState(vacio)
  const [editando, setEditando] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function cargar() {
    setAlmacenes(await api<Almacen[]>('/api/almacenes'))
  }
  useEffect(() => { cargar().catch(e => setError(e.message)) }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      if (editando === null) {
        await api('/api/almacenes', { method: 'POST', body: JSON.stringify(form) })
      } else {
        await api(`/api/almacenes/${editando}`, {
          method: 'PUT', body: JSON.stringify({ ...form, id: editando }),
        })
      }
      setForm(vacio)
      setEditando(null)
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.')
    }
  }

  return (
    <>
      <h1>Almacenes</h1>
      {esAdmin && (
        <form className="panel" onSubmit={onSubmit}>
          <h2>{editando === null ? 'Nuevo almacén' : 'Editar almacén'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.75rem' }}>
            <label>Nombre
              <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
            </label>
            <label>Ubicación
              <input value={form.ubicacion} onChange={e => setForm({ ...form, ubicacion: e.target.value })} />
            </label>
            <label>Activo
              <select value={String(form.activo)} onChange={e => setForm({ ...form, activo: e.target.value === 'true' })}>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          <button>{editando === null ? 'Crear' : 'Guardar cambios'}</button>{' '}
          {editando !== null && (
            <button type="button" className="secundario"
              onClick={() => { setEditando(null); setForm(vacio) }}>
              Cancelar
            </button>
          )}
        </form>
      )}
      <table>
        <thead><tr><th>Nombre</th><th>Ubicación</th><th>Activo</th>{esAdmin && <th></th>}</tr></thead>
        <tbody>
          {almacenes.map(a => (
            <tr key={a.id}>
              <td>{a.nombre}</td><td>{a.ubicacion}</td><td>{a.activo ? 'Sí' : 'No'}</td>
              {esAdmin && (
                <td>
                  <button type="button" onClick={() => {
                    setEditando(a.id)
                    setForm({ nombre: a.nombre, ubicacion: a.ubicacion ?? '', activo: a.activo })
                  }}>Editar</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "feat: pagina de almacenes"
```

---

### Task 6: Página Existencias (con alertas de stock mínimo)

**Files:**
- Modify: `frontend/src/paginas/Existencias.tsx`

- [ ] **Step 1: Implementar la página**

Reemplazar `src/paginas/Existencias.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { api } from '../api/cliente'
import type { Almacen, Existencia } from '../api/tipos'

export default function Existencias() {
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [existencias, setExistencias] = useState<Existencia[]>([])
  const [almacenId, setAlmacenId] = useState('')
  const [soloBajoMinimo, setSoloBajoMinimo] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Almacen[]>('/api/almacenes').then(setAlmacenes).catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (almacenId) params.set('almacenId', almacenId)
    if (soloBajoMinimo) params.set('bajoMinimo', 'true')
    api<Existencia[]>(`/api/existencias?${params}`)
      .then(setExistencias)
      .catch(e => setError(e.message))
  }, [almacenId, soloBajoMinimo])

  async function cambiarStockMinimo(e: Existencia) {
    const valor = prompt(`Stock mínimo para ${e.producto.nombre} en ${e.almacen.nombre}:`,
      String(e.stockMinimo))
    if (valor === null) return
    await api(`/api/existencias/${e.id}/stock-minimo`, {
      method: 'PUT', body: JSON.stringify(Number(valor)),
    })
    setExistencias(await api<Existencia[]>(`/api/existencias${almacenId ? `?almacenId=${almacenId}` : ''}`))
  }

  return (
    <>
      <h1>Existencias</h1>
      <div className="panel" style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
        <label style={{ maxWidth: 250 }}>Almacén
          <select value={almacenId} onChange={e => setAlmacenId(e.target.value)}>
            <option value="">Todos</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </label>
        <label style={{ width: 'auto' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={soloBajoMinimo}
            onChange={e => setSoloBajoMinimo(e.target.checked)} /> Solo bajo mínimo
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr><th>SKU</th><th>Producto</th><th>Almacén</th><th>Cantidad</th><th>Stock mínimo</th><th></th></tr>
        </thead>
        <tbody>
          {existencias.map(e => (
            <tr key={e.id}>
              <td>{e.producto.sku}</td>
              <td>{e.producto.nombre}</td>
              <td>{e.almacen.nombre}</td>
              <td className={e.bajoMinimo ? 'alerta' : ''}>
                {e.cantidad} {e.producto.unidadMedida}{e.bajoMinimo ? ' ⚠' : ''}
              </td>
              <td>{e.stockMinimo}</td>
              <td><button type="button" onClick={() => cambiarStockMinimo(e)}>Mínimo…</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "feat: pagina de existencias con alertas de stock"
```

---

### Task 7: Página Movimientos (TDD en validación del formulario)

**Files:**
- Create: `frontend/src/paginas/Movimientos.test.tsx`
- Modify: `frontend/src/paginas/Movimientos.tsx`

- [ ] **Step 1: Test que falla — transferencia exige origen ≠ destino**

`src/paginas/Movimientos.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Movimientos from './Movimientos'

const productos = [{ id: 1, sku: 'P-001', nombre: 'Tornillo', unidadMedida: 'pieza', activo: true }]
const almacenes = [
  { id: 1, nombre: 'Central', activo: true },
  { id: 2, nombre: 'Sucursal', activo: true },
]

describe('Movimientos', () => {
  beforeEach(() => {
    localStorage.setItem('almacen.sesion', JSON.stringify({ token: 't', nombre: 'Op', rol: 'Operador' }))
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (String(url).startsWith('/api/productos'))
        return Promise.resolve(new Response(JSON.stringify(productos), { status: 200 }))
      if (String(url).startsWith('/api/almacenes'))
        return Promise.resolve(new Response(JSON.stringify(almacenes), { status: 200 }))
      return Promise.resolve(new Response('{}', { status: 200 }))
    }))
  })

  it('rechaza transferencia con mismo origen y destino sin llamar a la API', async () => {
    render(<Movimientos />)
    await screen.findByText('Tornillo', { exact: false })

    await userEvent.selectOptions(screen.getByLabelText(/tipo/i), 'transferencia')
    await userEvent.selectOptions(screen.getByLabelText(/producto/i), '1')
    await userEvent.selectOptions(screen.getByLabelText(/origen/i), '1')
    await userEvent.selectOptions(screen.getByLabelText(/destino/i), '1')
    await userEvent.type(screen.getByLabelText(/cantidad/i), '5')
    await userEvent.click(screen.getByRole('button', { name: /registrar/i }))

    expect(await screen.findByText(/origen y destino/i)).toBeInTheDocument()
    const llamadasPost = (fetch as ReturnType<typeof vi.fn>).mock.calls
      .filter(c => c[1]?.method === 'POST')
    expect(llamadasPost).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `npm test`
Expected: FAIL — la página stub no tiene formulario.

- [ ] **Step 3: Implementar la página**

Reemplazar `src/paginas/Movimientos.tsx`:
```tsx
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/cliente'
import type { Almacen, Producto } from '../api/tipos'

type Tipo = 'entrada' | 'salida' | 'transferencia'

export default function Movimientos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [tipo, setTipo] = useState<Tipo>('entrada')
  const [productoId, setProductoId] = useState('')
  const [origenId, setOrigenId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  useEffect(() => {
    api<Producto[]>('/api/productos').then(p => setProductos(p.filter(x => x.activo)))
      .catch(e => setError(e.message))
    api<Almacen[]>('/api/almacenes').then(a => setAlmacenes(a.filter(x => x.activo)))
      .catch(e => setError(e.message))
  }, [])

  const usaOrigen = tipo === 'salida' || tipo === 'transferencia'
  const usaDestino = tipo === 'entrada' || tipo === 'transferencia'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setExito('')
    if (tipo === 'transferencia' && origenId === destinoId) {
      setError('El almacén de origen y destino no pueden ser el mismo.')
      return
    }
    try {
      await api(`/api/movimientos/${tipo}`, {
        method: 'POST',
        body: JSON.stringify({
          productoId: Number(productoId),
          cantidad: Number(cantidad),
          nota: nota || null,
          almacenOrigenId: usaOrigen ? Number(origenId) : null,
          almacenDestinoId: usaDestino ? Number(destinoId) : null,
        }),
      })
      setExito('Movimiento registrado.')
      setCantidad('')
      setNota('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar.')
    }
  }

  return (
    <>
      <h1>Registrar movimiento</h1>
      <form className="panel" onSubmit={onSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.75rem' }}>
          <label>Tipo
            <select value={tipo} onChange={e => setTipo(e.target.value as Tipo)}>
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </label>
          <label>Producto
            <select value={productoId} onChange={e => setProductoId(e.target.value)} required>
              <option value="">— Seleccionar —</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>)}
            </select>
          </label>
          <label>Cantidad
            <input type="number" min="0.001" step="any" value={cantidad}
              onChange={e => setCantidad(e.target.value)} required />
          </label>
          {usaOrigen && (
            <label>Almacén origen
              <select value={origenId} onChange={e => setOrigenId(e.target.value)} required>
                <option value="">— Seleccionar —</option>
                {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </label>
          )}
          {usaDestino && (
            <label>Almacén destino
              <select value={destinoId} onChange={e => setDestinoId(e.target.value)} required>
                <option value="">— Seleccionar —</option>
                {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </label>
          )}
          <label>Nota
            <input value={nota} onChange={e => setNota(e.target.value)} />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        {exito && <p style={{ color: '#1b7a3d' }}>{exito}</p>}
        <button>Registrar</button>
      </form>
    </>
  )
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npm test`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: registro de movimientos con validacion"
```

---

### Task 8: Páginas Reportes y Usuarios

**Files:**
- Modify: `frontend/src/paginas/Reportes.tsx`
- Modify: `frontend/src/paginas/Usuarios.tsx`

- [ ] **Step 1: Página Reportes (historial de movimientos con filtros)**

Reemplazar `src/paginas/Reportes.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { api } from '../api/cliente'
import type { Almacen, Movimiento, Producto } from '../api/tipos'

export default function Reportes() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [productoId, setProductoId] = useState('')
  const [almacenId, setAlmacenId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api<Producto[]>('/api/productos').then(setProductos).catch(e => setError(e.message))
    api<Almacen[]>('/api/almacenes').then(setAlmacenes).catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', `${hasta}T23:59:59`)
    if (productoId) params.set('productoId', productoId)
    if (almacenId) params.set('almacenId', almacenId)
    api<Movimiento[]>(`/api/movimientos?${params}`)
      .then(setMovimientos)
      .catch(e => setError(e.message))
  }, [desde, hasta, productoId, almacenId])

  return (
    <>
      <h1>Reporte de movimientos</h1>
      <div className="panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.75rem' }}>
        <label>Desde
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
        </label>
        <label>Hasta
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
        </label>
        <label>Producto
          <select value={productoId} onChange={e => setProductoId(e.target.value)}>
            <option value="">Todos</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>)}
          </select>
        </label>
        <label>Almacén
          <select value={almacenId} onChange={e => setAlmacenId(e.target.value)}>
            <option value="">Todos</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Cantidad</th>
            <th>Origen</th><th>Destino</th><th>Usuario</th><th>Nota</th></tr>
        </thead>
        <tbody>
          {movimientos.map(m => (
            <tr key={m.id}>
              <td>{new Date(m.fecha).toLocaleString()}</td>
              <td>{m.tipo}</td>
              <td>{m.producto.sku} — {m.producto.nombre}</td>
              <td>{m.cantidad}</td>
              <td>{m.almacenOrigen ?? '—'}</td>
              <td>{m.almacenDestino ?? '—'}</td>
              <td>{m.usuario}</td>
              <td>{m.nota}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
```

- [ ] **Step 2: Página Usuarios (solo Admin)**

Reemplazar `src/paginas/Usuarios.tsx`:
```tsx
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/cliente'
import type { UsuarioLista } from '../api/tipos'

const vacio = { email: '', nombre: '', password: '', rol: 'Operador' }

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioLista[]>([])
  const [form, setForm] = useState(vacio)
  const [error, setError] = useState('')

  async function cargar() {
    setUsuarios(await api<UsuarioLista[]>('/api/usuarios'))
  }
  useEffect(() => { cargar().catch(e => setError(e.message)) }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await api('/api/usuarios', { method: 'POST', body: JSON.stringify(form) })
      setForm(vacio)
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario.')
    }
  }

  async function cambiarActivo(u: UsuarioLista) {
    await api(`/api/usuarios/${u.id}/activo`, {
      method: 'PUT', body: JSON.stringify(!u.activo),
    })
    await cargar()
  }

  return (
    <>
      <h1>Usuarios</h1>
      <form className="panel" onSubmit={onSubmit}>
        <h2>Nuevo usuario</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.75rem' }}>
          <label>Email
            <input type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>Nombre
            <input value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })} required />
          </label>
          <label>Contraseña
            <input type="password" minLength={8} value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} required />
          </label>
          <label>Rol
            <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
              <option value="Operador">Operador</option>
              <option value="Admin">Admin</option>
            </select>
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <button>Crear usuario</button>
      </form>
      <table>
        <thead><tr><th>Email</th><th>Nombre</th><th>Rol</th><th>Activo</th><th></th></tr></thead>
        <tbody>
          {usuarios.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td><td>{u.nombre}</td><td>{u.rol}</td>
              <td>{u.activo ? 'Sí' : 'No'}</td>
              <td>
                <button type="button" className="secundario" onClick={() => cambiarActivo(u)}>
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
```

- [ ] **Step 3: Verificar build y tests**

Run: `npm run build && npm test`
Expected: build OK, 2 tests PASS.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: paginas de reportes y usuarios"
```

---

### Task 9: Verificación end-to-end manual

**Files:** ninguno (verificación).

- [ ] **Step 1: Levantar todo**

```powershell
# Terminal 1 (raíz del repo): base de datos
docker compose up -d
# Terminal 2: backend
cd backend; dotnet run --project src/SistemaAlmacen.Api --launch-profile http
# Terminal 3: frontend
cd frontend; npm run dev
```

- [ ] **Step 2: Recorrido manual en http://localhost:5173**

1. Login con `admin@almacen.local` / `Admin123!`.
2. Crear 2 almacenes (Central, Sucursal) y 1 producto.
3. Registrar entrada de 100 al Central → verlo en Existencias.
4. Transferir 30 a Sucursal → Existencias muestra 70/30.
5. Intentar salida de 500 → aparece el error de stock insuficiente.
6. Fijar stock mínimo 50 en Sucursal → fila marcada con ⚠ al filtrar "Solo bajo mínimo".
7. Reportes muestra los 3 movimientos con usuario y fecha.
8. Crear un usuario Operador, cerrar sesión, entrar con él → no ve "Usuarios" y no puede crear almacenes.

Expected: los 8 pasos funcionan sin errores en consola.

- [ ] **Step 3: Commit final (si hubo ajustes)**

```powershell
git add -A
git commit -m "chore: verificacion end-to-end del sistema v1"
```
