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

  async function cargarExistencias() {
    const params = new URLSearchParams()
    if (almacenId) params.set('almacenId', almacenId)
    if (soloBajoMinimo) params.set('bajoMinimo', 'true')
    setExistencias(await api<Existencia[]>(`/api/existencias?${params}`))
  }

  useEffect(() => {
    cargarExistencias().catch(e => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [almacenId, soloBajoMinimo])

  async function cambiarStockMinimo(e: Existencia) {
    const valor = prompt(`Stock mínimo para ${e.producto.nombre} en ${e.almacen.nombre}:`,
      String(e.stockMinimo))
    if (valor === null) return
    await api(`/api/existencias/${e.id}/stock-minimo`, {
      method: 'PUT', body: JSON.stringify(Number(valor)),
    })
    await cargarExistencias()
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
