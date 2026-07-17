import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api/cliente'
import type { Almacen, Movimiento, Producto, Existencia } from '../api/tipos'

interface FilaInventario {
  productoId: number
  sku: string
  nombre: string
  imagenUrl?: string | null
  unidadMedida: string
  stockSistema: number
  stockFisico: string // text input state
  almacenNombre: string
  almacenUbicacion: string
}

export default function Reportes() {
  const [tab, setTab] = useState<'historial' | 'auditoria'>('historial')
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  
  // Filtros Historial
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [productoId, setProductoId] = useState('')
  const [almacenId, setAlmacenId] = useState('')
  
  // Auditoría / Toma
  const [auditoriaAlmacenId, setAuditoriaAlmacenId] = useState('')
  const [planilla, setPlanilla] = useState<FilaInventario[]>([])
  
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [cargando, setCargando] = useState(false)

  // Cargar catálogos
  useEffect(() => {
    api<Producto[]>('/api/productos').then(setProductos).catch(e => setError(e.message))
    api<Almacen[]>('/api/almacenes').then(setAlmacenes).catch(e => setError(e.message))
  }, [])

  // Cargar historial de movimientos
  const cargarHistorial = () => {
    const params = new URLSearchParams()
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', `${hasta}T23:59:59`)
    if (productoId) params.set('productoId', productoId)
    if (almacenId) params.set('almacenId', almacenId)
    
    api<Movimiento[]>(`/api/movimientos?${params}`)
      .then(setMovimientos)
      .catch(e => setError(e.message))
  }

  useEffect(() => {
    if (tab === 'historial') {
      cargarHistorial()
    }
  }, [desde, hasta, productoId, almacenId, tab])

  // Cargar planilla de conteo para auditoría cuando cambia el almacén elegido
  useEffect(() => {
    if (tab === 'auditoria') {
      if (!auditoriaAlmacenId) {
        setPlanilla([])
        return
      }
      
      // Obtener existencias actuales en este almacén
      const params = new URLSearchParams()
      params.set('almacenId', auditoriaAlmacenId)
      
      Promise.all([
        api<Existencia[]>(`/api/existencias?${params}`),
        api<Producto[]>('/api/productos')
      ]).then(([existencias, todosProductos]) => {
        // Mapear existencias indexadas por producto id
        const existMap = new Map<number, number>()
        existencias.forEach(e => existMap.set(e.producto.id, e.cantidad))
        
        // Crear planilla con todos los productos (incluso los que no tienen stock aún)
        const selectedAlmacen = almacenes.find(a => String(a.id) === auditoriaAlmacenId)
        const filas: FilaInventario[] = todosProductos.map(p => ({
          productoId: p.id,
          sku: p.sku,
          nombre: p.nombre,
          imagenUrl: p.imagenUrl,
          unidadMedida: p.unidadMedida,
          stockSistema: existMap.get(p.id) ?? 0,
          stockFisico: '', // Vacío por defecto para que lo llene el operador
          almacenNombre: selectedAlmacen?.nombre ?? '',
          almacenUbicacion: selectedAlmacen?.ubicacion ?? 'Sin ubicación'
        }))
        setPlanilla(filas)
      }).catch(e => setError(e.message))
    }
  }, [auditoriaAlmacenId, tab])

  // Guardar/Aplicar diferencias de inventario
  async function aplicarAjustes(e: FormEvent) {
    e.preventDefault()
    setError('')
    setExito('')
    
    // Validar almacén seleccionado
    if (!auditoriaAlmacenId) {
      setError('Debes seleccionar un almacén para aplicar los ajustes.')
      return
    }

    // Filtrar filas que tengan un conteo válido
    const filasAjustar = planilla.filter(f => f.stockFisico !== '')
    if (filasAjustar.length === 0) {
      setError('Por favor, ingresa el stock físico de al menos un producto.')
      return
    }

    setCargando(true)
    try {
      let totalModificados = 0
      for (const fila of filasAjustar) {
        const fisico = Number(fila.stockFisico)
        if (isNaN(fisico) || fisico < 0) continue

        const diferencia = fisico - fila.stockSistema
        if (diferencia === 0) continue // Sin diferencia, sin ajuste

        // Preparar payload de movimiento
        const payload = {
          productoId: fila.productoId,
          cantidad: Math.abs(diferencia),
          nota: `Ajuste por Auditoría de Inventario Físico (Planilla)`,
          almacenOrigenId: diferencia < 0 ? Number(auditoriaAlmacenId) : null,
          almacenDestinoId: diferencia > 0 ? Number(auditoriaAlmacenId) : null
        }

        // Llamar a entrada o salida según diferencia
        const endpoint = diferencia > 0 ? '/api/movimientos/entrada' : '/api/movimientos/salida'
        await api(endpoint, {
          method: 'POST',
          body: JSON.stringify(payload)
        })
        totalModificados++
      }

      setExito(`Ajustes aplicados con éxito. Se realizaron ${totalModificados} movimientos de ajuste.`)
      
      // Forzar recarga de planilla con el nuevo stock sistema
      setAuditoriaAlmacenId('')
      setTimeout(() => setAuditoriaAlmacenId(auditoriaAlmacenId), 100)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  // Activa la impresión nativa de la planilla de conteo
  function imprimirPlanilla() {
    window.print()
  }

  return (
    <>
      {/* Print-only CSS style to hide navbar and show clean table */}
      <style>{`
        @media print {
          nav, aside, header, footer, button, .no-print {
            display: none !important;
          }
          body, main, .print-container {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            color: black !important;
          }
          .print-title {
            display: block !important;
            margin-bottom: 2rem;
            text-align: center;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #000 !important;
            padding: 8px !important;
          }
        }
        .print-title {
          display: none;
        }
      `}</style>

      {/* Printable Title Block */}
      <div className="print-title">
        <h1 className="text-xl font-bold uppercase tracking-wider">Planilla de Toma de Inventario Físico</h1>
        <p className="text-xs text-slate-500 mt-1">
          Almacén: {almacenes.find(a => String(a.id) === auditoriaAlmacenId)?.nombre || 'Todos'} • Dirección/Ubicación: {almacenes.find(a => String(a.id) === auditoriaAlmacenId)?.ubicacion || 'Sin dirección'} • Fecha de Conteo: ________________
        </p>
      </div>

      <div className="no-print">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-headline-lg text-headline-lg text-[#001f51] font-bold">Reportes y Auditoría</h1>
          <p className="font-body-md text-body-md text-slate-500 mt-2 max-w-2xl">
            Consulta el historial transaccional de movimientos o genera planillas de conteo físico para auditar existencias.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-4 border-b border-slate-200 mb-8 bg-white p-2 rounded-lg shadow-sm w-fit">
          <button
            onClick={() => { setTab('historial'); setError(''); setExito(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${tab === 'historial' ? 'bg-[#001f51] text-white shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Historial de Movimientos
          </button>
          <button
            onClick={() => { setTab('auditoria'); setError(''); setExito(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${tab === 'auditoria' ? 'bg-[#001f51] text-white shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Toma de Inventario Físico
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {error && (
        <div className="text-red-700 text-xs flex items-center gap-1.5 alert bg-red-50 p-3 rounded-lg border border-red-200 mb-6 no-print" style={{ color: '#ba1a1a' }}>
          <span className="material-symbols-outlined text-sm shrink-0">error</span>
          <span>{error}</span>
        </div>
      )}

      {exito && (
        <div className="text-green-700 text-xs flex items-center gap-1.5 alert bg-green-50 p-3 rounded-lg border border-green-200 mb-6 no-print">
          <span className="material-symbols-outlined text-sm shrink-0">check_circle</span>
          <span>{exito}</span>
        </div>
      )}

      {/* TAB 1: HISTORIAL DE MOVIMIENTOS */}
      {tab === 'historial' && (
        <div className="space-y-6 print-container">
          {/* Filters card */}
          <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm no-print">
            <h3 className="text-xs font-bold text-[#3755c3] uppercase tracking-widest mb-4">Filtrar Historial</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">Desde</label>
                <input
                  type="date"
                  value={desde}
                  onChange={e => setDesde(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  onChange={e => setHasta(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">Producto</label>
                <select
                  value={productoId}
                  onChange={e => setProductoId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all cursor-pointer"
                >
                  <option value="">Todos los productos</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">Almacén</label>
                <select
                  value={almacenId}
                  onChange={e => setAlmacenId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all cursor-pointer"
                >
                  <option value="">Todos los almacenes</option>
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Movements register table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-white no-print">
              <div>
                <h2 className="text-sm font-bold text-[#001f51] uppercase tracking-wider">HISTORIAL DE TRANSACCIONES</h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">Registro de entradas, salidas y transferencias</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha / Hora</th>
                    <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                    <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Producto</th>
                    <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Cantidad</th>
                    <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Origen</th>
                    <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Destino</th>
                    <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Operador</th>
                    <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movimientos.length > 0 ? (
                    movimientos.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-4 text-xs text-slate-500 font-medium">
                          {new Date(m.fecha).toLocaleString()}
                        </td>
                        <td className="px-8 py-4">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${m.tipo === 'Entrada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : m.tipo === 'Salida' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                            {m.tipo}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          <p className="font-semibold text-sm text-[#001f51] leading-tight">{m.producto.nombre}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-tighter">SKU: {m.producto.sku}</p>
                        </td>
                        <td className="px-8 py-4 text-sm text-right font-bold text-slate-800">
                          {m.cantidad}
                        </td>
                        <td className="px-8 py-4 text-xs text-slate-500 font-semibold">{m.almacenOrigen ?? '—'}</td>
                        <td className="px-8 py-4 text-xs text-slate-500 font-semibold">{m.almacenDestino ?? '—'}</td>
                        <td className="px-8 py-4 text-xs text-slate-400 font-semibold">{m.usuario}</td>
                        <td className="px-8 py-4 text-xs text-slate-400 italic font-medium max-w-xs truncate" title={m.nota ?? ''}>
                          {m.nota ?? '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-8 py-8 text-center text-slate-400 text-xs">
                        No se encontraron movimientos registrados en este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TOMA DE INVENTARIO FÍSICO */}
      {tab === 'auditoria' && (
        <div className="space-y-6 print-container">
          {/* Warehouse Selector & Actions card */}
          <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm no-print">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex-grow max-w-md">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">Almacén a Auditar</label>
                <select
                  value={auditoriaAlmacenId}
                  onChange={e => setAuditoriaAlmacenId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#3755c3] transition-all cursor-pointer font-semibold text-[#001f51]"
                >
                  <option value="">-- Selecciona el almacén para cargar la planilla --</option>
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>

              {auditoriaAlmacenId && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={imprimirPlanilla}
                    className="px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm !bg-transparent"
                  >
                    <span className="material-symbols-outlined text-lg">print</span>
                    <span>Imprimir Planilla</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {auditoriaAlmacenId ? (
            <form onSubmit={aplicarAjustes} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-white no-print">
                <div>
                  <h2 className="text-sm font-bold text-[#001f51] uppercase tracking-wider">PLANILLA DE CONTEO FISICO</h2>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Ingresa las cantidades contadas para ajustar las diferencias con el sistema.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">PRODUCTO / DETALLES</th>
                      <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">ALMACÉN / UBICACIÓN</th>
                      <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">STOCK SISTEMA</th>
                      <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-48">STOCK FÍSICO (CONTADO)</th>
                      <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center no-print">DIFERENCIA</th>
                      <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center no-print">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {planilla.map((fila, index) => {
                      const fisico = fila.stockFisico === '' ? NaN : Number(fila.stockFisico)
                      const diferencia = isNaN(fisico) ? 0 : fisico - fila.stockSistema

                      return (
                        <tr key={fila.productoId} className="hover:bg-slate-50/50 transition-colors group">
                          {/* Product Info */}
                          <td className="px-8 py-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 no-print">
                              {fila.imagenUrl ? (
                                <img
                                  src={fila.imagenUrl}
                                  alt={fila.nombre}
                                  className="w-full h-full object-cover"
                                  onError={e => {
                                    ;(e.target as HTMLImageElement).src = 'https://placehold.co/40x40?text=Error'
                                  }}
                                />
                              ) : (
                                <span className="material-symbols-outlined text-slate-400 text-lg">inventory_2</span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-[#001f51] leading-tight">{fila.nombre}</p>
                              <p className="text-[11px] text-slate-400 font-medium mt-0.5 uppercase tracking-tighter">SKU: {fila.sku}</p>
                            </div>
                          </td>

                          {/* Location details */}
                          <td className="px-8 py-4 text-xs font-semibold text-slate-500">
                            <div>{fila.almacenNombre}</div>
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">{fila.almacenUbicacion}</div>
                          </td>

                          {/* System Stock */}
                          <td className="px-8 py-4 text-sm text-right font-bold text-slate-700">
                            {fila.stockSistema} <span className="text-xs text-slate-400 font-normal">{fila.unidadMedida}</span>
                          </td>

                          {/* Physical Input / Print Line */}
                          <td className="px-8 py-4 text-center">
                            {/* Input for interactive UI */}
                            <input
                              type="number"
                              min="0"
                              placeholder="Sin contar"
                              value={fila.stockFisico}
                              onChange={e => {
                                const nuevasFilas = [...planilla]
                                nuevasFilas[index].stockFisico = e.target.value
                                setPlanilla(nuevasFilas)
                              }}
                              className="no-print w-32 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-center outline-none focus:border-[#3755c3] font-semibold text-slate-800 bg-slate-50/50"
                            />
                            {/* Line for printing */}
                            <span className="hidden print:inline-block w-24 border-b border-black h-5"></span>
                          </td>

                          {/* Difference */}
                          <td className="px-8 py-4 text-center no-print font-bold text-sm">
                            {fila.stockFisico === '' ? (
                              <span className="text-slate-300">—</span>
                            ) : diferencia === 0 ? (
                              <span className="text-slate-400">0</span>
                            ) : diferencia > 0 ? (
                              <span className="text-emerald-600">+{diferencia}</span>
                            ) : (
                              <span className="text-red-600">{diferencia}</span>
                            )}
                          </td>

                          {/* Status Pill */}
                          <td className="px-8 py-4 text-center no-print">
                            {fila.stockFisico === '' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400">
                                PENDIENTE
                              </span>
                            ) : diferencia === 0 ? (
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                                CONCILIADO
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                                DESVIACIÓN
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Apply Changes bar */}
              <div className="p-8 border-t border-slate-200 bg-slate-50/50 flex justify-end items-center gap-4 no-print">
                <p className="text-xs text-slate-500 font-medium">
                  * Al aplicar ajustes, el sistema registrará los movimientos necesarios para ajustar el stock del sistema al stock físico real.
                </p>
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-6 py-3 bg-[#001f51] hover:bg-[#00337c] text-white rounded-lg text-sm font-bold shadow transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {cargando ? (
                    <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">inventory</span>
                  )}
                  <span>Aplicar Ajustes de Auditoría</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-xl shadow-sm no-print">
              <span className="material-symbols-outlined text-slate-300 text-5xl mb-4">inventory</span>
              <p className="text-sm font-semibold text-slate-500">Selecciona un almacén para cargar la planilla de auditoría física.</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
