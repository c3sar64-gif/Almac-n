import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/cliente'
import type { UsuarioLista } from '../api/tipos'
import { useAuth } from '../auth/AuthContext'

const vacio = { email: '', nombre: '', password: '', rol: 'Operador' }

export default function Usuarios() {
  const { sesion } = useAuth()
  const esAdmin = sesion?.rol === 'Admin'
  const [usuarios, setUsuarios] = useState<UsuarioLista[]>([])
  const [form, setForm] = useState(vacio)
  const [error, setError] = useState('')

  async function cargar() {
    setUsuarios(await api<UsuarioLista[]>('/api/usuarios'))
  }
  useEffect(() => {
    if (esAdmin) cargar().catch(e => setError(e.message))
  }, [esAdmin])

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

  // El backend ya restringe /api/usuarios a Admin; esto evita mostrar la UI de gestión.
  if (!esAdmin) {
    return <p className="error">Solo los administradores pueden gestionar usuarios.</p>
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
