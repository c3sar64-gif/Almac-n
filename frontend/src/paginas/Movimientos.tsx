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
