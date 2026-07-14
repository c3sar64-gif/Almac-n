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
