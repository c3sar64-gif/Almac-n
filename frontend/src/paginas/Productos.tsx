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
