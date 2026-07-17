import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/cliente'
import type { Almacen, Producto } from '../api/tipos'

type Tipo = 'entrada' | 'salida' | 'transferencia'

export default function Movimientos() {
  const navigate = useNavigate()
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
  const [cargando, setCargando] = useState(false)
  const [stockDisponible, setStockDisponible] = useState<number | null>(null)

  useEffect(() => {
    api<Producto[]>('/api/productos')
      .then(p => setProductos(p.filter(x => x.activo)))
      .catch(e => setError(e.message))
    api<Almacen[]>('/api/almacenes')
      .then(a => setAlmacenes(a.filter(x => x.activo)))
      .catch(e => setError(e.message))
  }, [])

  const usaOrigen = tipo === 'salida' || tipo === 'transferencia'
  const usaDestino = tipo === 'entrada' || tipo === 'transferencia'

  useEffect(() => {
    if (usaOrigen && productoId && origenId) {
      setStockDisponible(null)
      const params = new URLSearchParams()
      params.set('almacenId', origenId)
      api<any[]>(`/api/existencias?${params}`)
        .then(existencias => {
          const match = existencias.find(e => e.producto.id === Number(productoId))
          setStockDisponible(match ? match.cantidad : 0)
        })
        .catch(() => {
          setStockDisponible(0)
        })
    } else {
      setStockDisponible(null)
    }
  }, [productoId, origenId, usaOrigen, tipo])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setExito('')
    setCargando(true)

    if (tipo === 'transferencia' && origenId === destinoId) {
      setError('El almacén de origen y destino no pueden ser el mismo.')
      setCargando(false)
      return
    }

    if (usaOrigen && stockDisponible !== null && Number(cantidad) > stockDisponible) {
      setError('La cantidad ingresada supera el stock disponible en el almacén de origen.')
      setCargando(false)
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
      setExito(`Movimiento de ${tipo.toUpperCase()} registrado con éxito.`)
      setCantidad('')
      setNota('')
      setProductoId('')
      setOrigenId('')
      setDestinoId('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-stack-md mb-stack-lg">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">Registrar Movimiento</h1>
          <p className="text-on-surface-variant font-body-md">Ingresa los flujos de inventario (Entradas, Salidas y Transferencias).</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center gap-stack-sm bg-white/60 border border-outline-variant hover:bg-white text-on-surface px-stack-lg py-stack-sm rounded-lg font-bold transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span>Volver a Existencias</span>
        </button>
      </header>

      {/* Main Form Container */}
      <div className="max-w-3xl mx-auto liquid-glass rounded-xl overflow-hidden border border-white/40 p-stack-lg">
        <form className="space-y-stack-lg" onSubmit={onSubmit}>
          
          {/* Movement Type Card Selector */}
          <div>
            <label className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider block mb-stack-sm">
              Tipo de Movimiento
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-stack-md">
              {/* Card 1: Entrada */}
              <button
                type="button"
                onClick={() => { setTipo('entrada'); setError(''); setExito('') }}
                className={`flex flex-col items-center justify-center p-stack-md rounded-lg border-2 transition-all cursor-pointer ${tipo === 'entrada' ? 'bg-primary/10 border-primary text-primary shadow-md shadow-primary/10' : 'bg-white/40 border-outline-variant hover:bg-white/60 text-on-surface-variant'}`}
              >
                <span className="material-symbols-outlined text-[32px] mb-base">local_shipping</span>
                <span className="font-bold text-body-md">Entrada</span>
                <span className="text-xs opacity-75 mt-1 text-center">Ingreso de stock externo</span>
              </button>

              {/* Card 2: Salida */}
              <button
                type="button"
                onClick={() => { setTipo('salida'); setError(''); setExito('') }}
                className={`flex flex-col items-center justify-center p-stack-md rounded-lg border-2 transition-all cursor-pointer ${tipo === 'salida' ? 'bg-secondary/5 border-secondary text-secondary shadow-md shadow-secondary/5' : 'bg-white/40 border-outline-variant hover:bg-white/60 text-on-surface-variant'}`}
              >
                <span className="material-symbols-outlined text-[32px] mb-base">outbox</span>
                <span className="font-bold text-body-md">Salida</span>
                <span className="text-xs opacity-75 mt-1 text-center">Despacho o merma</span>
              </button>

              {/* Card 3: Transferencia */}
              <button
                type="button"
                onClick={() => { setTipo('transferencia'); setError(''); setExito('') }}
                className={`flex flex-col items-center justify-center p-stack-md rounded-lg border-2 transition-all cursor-pointer ${tipo === 'transferencia' ? 'bg-primary-container/10 border-primary-container text-primary-container shadow-md shadow-primary-container/10' : 'bg-white/40 border-outline-variant hover:bg-white/60 text-on-surface-variant'}`}
              >
                <span className="material-symbols-outlined text-[32px] mb-base">swap_horiz</span>
                <span className="font-bold text-body-md">Transferencia</span>
                <span className="text-xs opacity-75 mt-1 text-center">Movimiento entre almacenes</span>
              </button>
            </div>
          </div>

          <hr className="border-outline-variant/30" />

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
            
            {/* Product Selector */}
            <div className="flex flex-col gap-base">
              <label htmlFor="producto" className="text-label-sm font-label-sm text-on-surface-variant">
                Seleccionar Producto
              </label>
              <select
                id="producto"
                value={productoId}
                onChange={e => setProductoId(e.target.value)}
                required
                className="w-full py-2.5 px-3 bg-white/50 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary text-body-md"
              >
                <option value="">— Seleccionar —</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="flex flex-col gap-base">
              <label htmlFor="cantidad" className="text-label-sm font-label-sm text-on-surface-variant">
                Cantidad a Mover
              </label>
              <input
                id="cantidad"
                type="number"
                min="0.001"
                step="any"
                value={cantidad}
                onChange={e => setQuantityWithUnit(e.target.value)}
                required
                placeholder="0.00"
                className="w-full py-2.5 px-3 bg-white/50 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary text-body-md"
              />
              {stockDisponible !== null && (
                <div className="mt-1 flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-slate-500">
                    Stock disponible: <strong className="text-slate-700">{stockDisponible}</strong> {productos.find(p => p.id === Number(productoId))?.unidadMedida ?? 'unidades'}
                  </span>
                  {Number(cantidad) > stockDisponible && (
                    <span className="text-red-600 flex items-center gap-0.5" style={{ color: '#ba1a1a' }}>
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      Excede el disponible
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Source Warehouse (Origen) */}
            {usaOrigen && (
              <div className="flex flex-col gap-base animate-fadeIn">
                <label htmlFor="origen" className="text-label-sm font-label-sm text-on-surface-variant">
                  Almacén de Origen
                </label>
                <select
                  id="origen"
                  value={origenId}
                  onChange={e => setOrigenId(e.target.value)}
                  required
                  className="w-full py-2.5 px-3 bg-white/50 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary text-body-md"
                >
                  <option value="">— Seleccionar —</option>
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Destination Warehouse (Destino) */}
            {usaDestino && (
              <div className="flex flex-col gap-base animate-fadeIn">
                <label htmlFor="destino" className="text-label-sm font-label-sm text-on-surface-variant">
                  Almacén de Destino
                </label>
                <select
                  id="destino"
                  value={destinoId}
                  onChange={e => setDestinoId(e.target.value)}
                  required
                  className="w-full py-2.5 px-3 bg-white/50 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary text-body-md"
                >
                  <option value="">— Seleccionar —</option>
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notes */}
            <div className="flex flex-col gap-base md:col-span-2">
              <label htmlFor="nota" className="text-label-sm font-label-sm text-on-surface-variant">
                Notas / Justificación del Movimiento
              </label>
              <input
                id="nota"
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Ej. Carga de lote de importación, despacho de orden, etc."
                className="w-full py-2.5 px-3 bg-white/50 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary text-body-md"
              />
            </div>
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="text-error text-sm flex items-center gap-1 alert bg-red-50 p-3 rounded border border-red-200" style={{ color: '#ba1a1a' }}>
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          {exito && (
            <div className="text-green-700 text-sm flex items-center gap-1 alert bg-green-50 p-3 rounded border border-green-200">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>{exito}</span>
            </div>
          )}

          <hr className="border-outline-variant/30" />

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={cargando || (usaOrigen && stockDisponible !== null && Number(cantidad) > stockDisponible)}
              className="w-full sm:w-auto bg-primary-container text-white px-stack-lg py-3 rounded-lg font-bold shadow-lg shadow-primary-container/20 hover:scale-[1.01] active:scale-[0.99] hover:bg-primary transition-all disabled:opacity-50 flex items-center justify-center gap-stack-sm cursor-pointer"
            >
              {cargando ? (
                <>
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <span>Registrar Movimiento</span>
                  <span className="material-symbols-outlined">send</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )

  // Helper to handle quantity input
  function setQuantityWithUnit(val: string) {
    setCantidad(val)
  }
}
