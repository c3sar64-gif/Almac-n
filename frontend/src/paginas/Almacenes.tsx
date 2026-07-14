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
