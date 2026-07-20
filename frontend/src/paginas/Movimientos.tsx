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

  const getTodayLocalStr = () => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const [fecha, setFecha] = useState(getTodayLocalStr())
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [cargando, setCargando] = useState(false)

  const [stockOrigen, setStockOrigen] = useState<number | null>(null)
  const [stockDestino, setStockDestino] = useState<number | null>(null)

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

  // Fetch stock para origen y destino
  useEffect(() => {
    if (productoId && origenId && usaOrigen) {
      const params = new URLSearchParams()
      params.set('almacenId', origenId)
      api<any[]>(`/api/existencias?${params}`)
        .then(existencias => {
          const match = existencias.find(e => e.producto.id === Number(productoId))
          setStockOrigen(match ? match.cantidad : 0)
        })
        .catch(() => setStockOrigen(0))
    } else {
      setStockOrigen(null)
    }

    if (productoId && destinoId && usaDestino) {
      const params = new URLSearchParams()
      params.set('almacenId', destinoId)
      api<any[]>(`/api/existencias?${params}`)
        .then(existencias => {
          const match = existencias.find(e => e.producto.id === Number(productoId))
          setStockDestino(match ? match.cantidad : 0)
        })
        .catch(() => setStockDestino(0))
    } else {
      setStockDestino(null)
    }
  }, [productoId, origenId, destinoId, usaOrigen, usaDestino, tipo])

  const productoSel = productos.find(p => p.id === Number(productoId))
  const unidadSel = productoSel?.unidadMedida ?? 'unidades'
  const cantNum = Number(cantidad) || 0

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

    if (usaOrigen && stockOrigen !== null && cantNum > stockOrigen) {
      setError('La cantidad ingresada supera el stock disponible en el almacén de origen.')
      setCargando(false)
      return
    }

    try {
      await api(`/api/movimientos/${tipo}`, {
        method: 'POST',
        body: JSON.stringify({
          productoId: Number(productoId),
          cantidad: cantNum,
          nota: nota || null,
          almacenOrigenId: usaOrigen ? Number(origenId) : null,
          almacenDestinoId: usaDestino ? Number(destinoId) : null,
          fecha: fecha ? `${fecha}T12:00:00Z` : null,
        }),
      })
      setExito(`Movimiento de ${tipo.toUpperCase()} registrado con éxito.`)
      setCantidad('')
      setNota('')
      setProductoId('')
      setOrigenId('')
      setDestinoId('')
      setStockOrigen(null)
      setStockDestino(null)
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
            
            {/* Fecha del Movimiento */}
            <div className="flex flex-col gap-base">
              <label htmlFor="fecha" className="text-label-sm font-label-sm text-on-surface-variant flex items-center justify-between">
                <span>Fecha del Movimiento</span>
                <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Por defecto: Hoy</span>
              </label>
              <input
                id="fecha"
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                required
                className="w-full py-2.5 px-3 bg-white/50 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary text-body-md font-bold text-[#001f51]"
              />
            </div>

            {/* Product Selector */}
            <div className="flex flex-col gap-base">
              <label htmlFor="producto" className="text-label-sm font-label-sm text-on-surface-variant">
                Seleccionar Producto / Insumo
              </label>
              <select
                id="producto"
                value={productoId}
                onChange={e => setProductoId(e.target.value)}
                required
                className="w-full py-2.5 px-3 bg-white/50 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary text-body-md font-medium"
              >
                <option value="">— Seleccionar —</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.nombre} ({p.unidadMedida})
                  </option>
                ))}
              </select>
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
                  className="w-full py-2.5 px-3 bg-white/50 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary text-body-md font-medium"
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
                  className="w-full py-2.5 px-3 bg-white/50 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary text-body-md font-medium"
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

            {/* Quantity */}
            <div className="flex flex-col gap-base md:col-span-2">
              <label htmlFor="cantidad" className="text-label-sm font-label-sm text-on-surface-variant">
                Cantidad a Mover ({unidadSel})
              </label>
              <input
                id="cantidad"
                type="number"
                min="0.001"
                step="any"
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                required
                placeholder="0.00"
                className="w-full py-2.5 px-3 bg-white/50 border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary text-body-lg font-extrabold text-[#001f51]"
              />
            </div>

            {/* Live Stock Kardex Calculation Preview Box */}
            {productoId && (stockOrigen !== null || stockDestino !== null) && (
              <div className="md:col-span-2 bg-gradient-to-r from-slate-900 to-[#001f51] p-4 rounded-xl text-white shadow-lg animate-fadeIn">
                <div className="text-[11px] font-extrabold text-blue-300 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-blue-400">calculate</span>
                    <span>Proyección de Saldo en Kardex ({tipo.toUpperCase()})</span>
                  </div>
                  <span className="text-[10px] text-slate-300 font-normal">Cálculo Automático</span>
                </div>

                {tipo === 'entrada' && stockDestino !== null && (
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                      <span className="text-[10px] text-slate-300 block uppercase font-medium">Saldo Actual</span>
                      <span className="text-base font-extrabold text-white">{stockDestino} {unidadSel}</span>
                    </div>
                    <div className="bg-emerald-500/20 p-2.5 rounded-lg border border-emerald-400/30">
                      <span className="text-[10px] text-emerald-300 block uppercase font-medium">Ingreso</span>
                      <span className="text-base font-extrabold text-emerald-300">+{cantNum} {unidadSel}</span>
                    </div>
                    <div className="bg-blue-500/30 p-2.5 rounded-lg border border-blue-400/40">
                      <span className="text-[10px] text-blue-200 block uppercase font-medium">Saldo Resultante</span>
                      <span className="text-base font-black text-white">{stockDestino + cantNum} {unidadSel}</span>
                    </div>
                  </div>
                )}

                {tipo === 'salida' && stockOrigen !== null && (
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                      <span className="text-[10px] text-slate-300 block uppercase font-medium">Saldo Actual</span>
                      <span className="text-base font-extrabold text-white">{stockOrigen} {unidadSel}</span>
                    </div>
                    <div className="bg-amber-500/20 p-2.5 rounded-lg border border-amber-400/30">
                      <span className="text-[10px] text-amber-300 block uppercase font-medium">Salida</span>
                      <span className="text-base font-extrabold text-amber-300">-{cantNum} {unidadSel}</span>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${stockOrigen - cantNum < 0 ? 'bg-rose-500/30 border-rose-400 text-rose-200' : 'bg-blue-500/30 border-blue-400/40 text-white'}`}>
                      <span className="text-[10px] block uppercase font-medium opacity-80">Saldo Resultante</span>
                      <span className="text-base font-black">{stockOrigen - cantNum} {unidadSel}</span>
                    </div>
                  </div>
                )}

                {tipo === 'transferencia' && (
                  <div className="space-y-2">
                    {stockOrigen !== null && (
                      <div className="flex items-center justify-between bg-white/10 px-3 py-2 rounded-lg text-xs">
                        <span className="text-slate-300 font-medium">Origen: Saldo {stockOrigen} ➔ <strong className="text-amber-300">Salida -{cantNum}</strong></span>
                        <span className={`font-black ${stockOrigen - cantNum < 0 ? 'text-rose-300' : 'text-white'}`}>Nuevo Saldo Origen: {stockOrigen - cantNum} {unidadSel}</span>
                      </div>
                    )}
                    {stockDestino !== null && (
                      <div className="flex items-center justify-between bg-white/10 px-3 py-2 rounded-lg text-xs">
                        <span className="text-slate-300 font-medium">Destino: Saldo {stockDestino} ➔ <strong className="text-emerald-300">Ingreso +{cantNum}</strong></span>
                        <span className="font-black text-emerald-300">Nuevo Saldo Destino: {stockDestino + cantNum} {unidadSel}</span>
                      </div>
                    )}
                  </div>
                )}
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
              disabled={cargando || (usaOrigen && stockOrigen !== null && cantNum > stockOrigen)}
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
}
