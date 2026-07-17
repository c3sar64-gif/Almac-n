import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/cliente'
import type { Almacen, Existencia } from '../api/tipos'

interface MovimientoListItem {
  id: number
  tipo: string
  fecha: string
  cantidad: number
  nota: string | null
  producto: { id: number; sku: string; nombre: string }
  almacenOrigen: string | null
  almacenDestino: string | null
  usuario: string
}
export default function Existencias() {
  const navigate = useNavigate()
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [existencias, setExistencias] = useState<Existencia[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoListItem[]>([])
  const [almacenId, setAlmacenId] = useState('')
  const [soloBajoMinimo, setSoloBajoMinimo] = useState(false)
  const [buscar, setBuscar] = useState('')
  const [pagina, setPagina] = useState(1)
  const [error, setError] = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [modalStock, setModalStock] = useState<Existencia | null>(null)
  const [nuevoMinimo, setNuevoMinimo] = useState('')

  const ITEMS_POR_PAGINA = 5

  useEffect(() => {
    api<Almacen[]>('/api/almacenes')
      .then(setAlmacenes)
      .catch(e => setError(e.message))

    // Cargar movimientos para métricas y gráficos
    api<MovimientoListItem[]>('/api/movimientos')
      .then(setMovimientos)
      .catch(e => setError(e.message))
  }, [])

  async function cargarExistencias() {
    const params = new URLSearchParams()
    if (almacenId) params.set('almacenId', almacenId)
    if (soloBajoMinimo) params.set('bajoMinimo', 'true')
    try {
      const data = await api<Existencia[]>(`/api/existencias?${params}`)
      setExistencias(data)
      setPagina(1) // Resetear a primera página al filtrar
    } catch (e: any) {
      setError(e.message)
    }
  }

  useEffect(() => {
    cargarExistencias()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [almacenId, soloBajoMinimo])

  function abrirModal(e: Existencia) {
    setModalStock(e)
    setNuevoMinimo(String(e.stockMinimo))
    setError('')
  }

  // Filtrado por buscador local
  const existenciasFiltradas = existencias.filter(e => {
    const matchBuscar =
      e.producto.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
      e.producto.sku.toLowerCase().includes(buscar.toLowerCase())
    return matchBuscar
  })

  // Paginación
  const totalPaginas = Math.ceil(existenciasFiltradas.length / ITEMS_POR_PAGINA)
  const existenciasPaginadas = existenciasFiltradas.slice(
    (pagina - 1) * ITEMS_POR_PAGINA,
    pagina * ITEMS_POR_PAGINA
  )

  // Cálculos de métricas
  const totalSKUs = new Set(existencias.map(e => e.producto.sku)).size
  const stockCriticoCount = existencias.filter(e => e.bajoMinimo).length
  const stockOptimoCount = existencias.filter(e => !e.bajoMinimo).length

  // Calcular salidas hoy
  const salidasHoy = movimientos
    .filter(m => {
      const mDate = new Date(m.fecha)
      const hoy = new Date()
      return (
        m.tipo === 'Salida' &&
        mDate.getDate() === hoy.getDate() &&
        mDate.getMonth() === hoy.getMonth() &&
        mDate.getFullYear() === hoy.getFullYear()
      )
    })
    .reduce((acc, m) => acc + m.cantidad, 0)

  // Generar datos de gráfico semanal (Movimientos totales por día de Lunes a Domingo)
  const getWeeklyData = () => {
    const data = [0, 0, 0, 0, 0, 0, 0] // L, M, X, J, V, S, D
    const today = new Date()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(today.getDate() - 7)

    const getDayIndex = (date: Date) => {
      const day = date.getDay() // 0 = Domingo, 1 = Lunes...
      return day === 0 ? 6 : day - 1 // Mapear a 0=Lunes, 6=Domingo
    }

    movimientos.forEach(m => {
      const mDate = new Date(m.fecha)
      if (mDate >= sevenDaysAgo) {
        const idx = getDayIndex(mDate)
        data[idx] += m.cantidad
      }
    })

    const maxVal = Math.max(...data, 1)
    return data.map(val => ({
      value: val,
      height: `${Math.min(Math.round((val / maxVal) * 85) + 15, 100)}%`, // mínimo 15% de altura visual
    }))
  }

  const weeklyData = getWeeklyData()

  // Formateador de tiempo relativo
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const diffMs = new Date().getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 1) return 'Hace un momento'
    if (diffMins < 60) return `Hace ${diffMins} minutos`
    if (diffHours < 24) return `Hace ${diffHours} horas`
    return date.toLocaleDateString()
  }

  // Helper para asignar un icono ilustrativo basado en el nombre del producto
  const getProductIcon = (name: string) => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('sensor')) return 'sensors'
    if (lowerName.includes('rodamiento') || lowerName.includes('acero')) return 'settings'
    if (lowerName.includes('cable') || lowerName.includes('fibra')) return 'settings_ethernet'
    if (lowerName.includes('correa') || lowerName.includes('belt')) return 'sync_alt'
    return 'inventory_2'
  }

  return (
    <>
      {/* Header & Action Row */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-stack-md mb-8">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight font-bold">Gestión de Existencias</h1>
          <p className="text-slate-500 font-body-md mt-1">Monitoreo de inventario en tiempo real y optimización de stock.</p>
        </div>
        <button
          onClick={() => navigate('/productos')}
          className="flex items-center justify-center gap-2 bg-[#00327d] text-white px-6 py-2.5 rounded shadow hover:bg-primary transition-all font-bold cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>Nuevo Producto</span>
        </button>
      </header>

      {error && (
        <div className="mb-6 text-red-700 text-sm flex items-center gap-1 alert bg-red-50 p-3 rounded border border-red-200">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Grid (Stitch White Style) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total SKU */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[135px]">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-[#00327d] bg-[#dae2ff] p-2.5 rounded-lg text-xl">inventory_2</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">GLOBAL</span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">TOTAL SKUs</p>
            <p className="text-3xl font-bold text-[#00327d] mt-1">{totalSKUs.toLocaleString()}</p>
          </div>
        </div>

        {/* Critico */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[135px]">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-[#bb0014] bg-[#ffdad6] p-2.5 rounded-lg text-xl">warning</span>
            <span className={`text-xs font-bold uppercase tracking-wider ${stockCriticoCount > 0 ? 'text-[#bb0014]' : 'text-emerald-600'}`}>
              {stockCriticoCount > 0 ? 'SISTEMA INESTABLE' : 'SISTEMA ESTABLE'}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">STOCK CRÍTICO</p>
            <p className={`text-3xl font-bold mt-1 ${stockCriticoCount > 0 ? 'text-[#bb0014]' : 'text-emerald-600'}`}>
              {stockCriticoCount}
            </p>
          </div>
        </div>

        {/* Optimo */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[135px]">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-emerald-600 bg-emerald-50 p-2.5 rounded-lg text-xl">check_circle</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">STOCK ÓPTIMO</span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">STOCK ÓPTIMO</p>
            <p className="text-3xl font-bold text-[#00327d] mt-1">{stockOptimoCount}</p>
          </div>
        </div>

        {/* Movimientos */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[135px]">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-[#0047ab] bg-[#dee8ff] p-2.5 rounded-lg text-xl">swap_horiz</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">SALIDAS HOY</span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">SALIDAS HOY</p>
            <p className="text-3xl font-bold text-[#00327d] mt-1">{salidasHoy}</p>
          </div>
        </div>
      </section>

      {/* Inventory Table Container (Stitch White Style) */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-5 flex flex-col gap-4 border-b border-slate-200 bg-white">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between w-full">
            <div className="relative w-full md:w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#00327d] focus:border-[#00327d] outline-none transition-all placeholder:text-slate-400 text-sm"
                placeholder="Buscar por SKU, nombre o categoría..."
                type="text"
                value={buscar}
                onChange={e => setBuscar(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto justify-end">
              <button
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-colors cursor-pointer ${mostrarFiltros ? 'bg-[#00327d] text-white border-[#00327d]' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <span className="material-symbols-outlined text-lg">filter_list</span>
                <span className="font-bold">FILTROS</span>
              </button>
            </div>
          </div>

          {/* Collapsible Filter Bar */}
          {mostrarFiltros && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-fadeIn">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtrar por Almacén</label>
                <select
                  value={almacenId}
                  onChange={e => setAlmacenId(e.target.value)}
                  className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary text-sm"
                >
                  <option value="">Todos los Almacenes</option>
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center h-full pt-5">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={soloBajoMinimo}
                    onChange={e => setSoloBajoMinimo(e.target.checked)}
                    className="w-5 h-5 border-slate-300 rounded text-[#00327d] focus:ring-0 focus:ring-offset-0 transition-all"
                  />
                  <span className="text-sm text-slate-600 group-hover:text-primary">
                    Mostrar solo productos bajo stock mínimo (Críticos)
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">SKU ID</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Almacén</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Cantidad</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Mínimo</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {existenciasPaginadas.length > 0 ? (
                existenciasPaginadas.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-sm text-[#00327d] font-bold">{e.producto.sku}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                          {e.producto.imagenUrl ? (
                            <img
                              src={e.producto.imagenUrl}
                              alt={e.producto.nombre}
                              className="w-full h-full object-cover"
                              onError={e => {
                                ;(e.target as HTMLImageElement).src =
                                  'https://placehold.co/40x40?text=Error'
                              }}
                            />
                          ) : (
                            <span className="material-symbols-outlined text-lg">{getProductIcon(e.producto.nombre)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{e.producto.nombre}</p>
                          <p className="text-xs text-slate-400">{e.producto.categoria || 'Sin categoría'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{e.almacen.nombre}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-slate-800">
                      {e.cantidad} <span className="text-xs text-slate-400 font-normal">{e.producto.unidadMedida}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-500">{e.stockMinimo}</td>
                    <td className="px-6 py-4">
                      {e.bajoMinimo ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#ffdad6] text-[#bb0014] text-xs font-bold border border-[#ffb4ab]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#bb0014]"></span>
                          BAJO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#e7eeff] text-[#00327d] text-xs font-bold border border-[#b1c5ff]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0047ab]"></span>
                          ÓPTIMO
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => abrirModal(e)}
                        className="material-symbols-outlined !text-slate-400 hover:text-[#3755c3] transition-colors cursor-pointer text-lg !p-1 hover:bg-slate-100 rounded-full !bg-white border border-slate-150 flex items-center justify-center"
                        title="Modificar stock mínimo"
                      >
                        edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-sm">
                    No se encontraron existencias en el inventario.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPaginas > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-white">
            <span className="text-xs text-slate-400">
              Mostrando {Math.min((pagina - 1) * ITEMS_POR_PAGINA + 1, existenciasFiltradas.length)}-
              {Math.min(pagina * ITEMS_POR_PAGINA, existenciasFiltradas.length)} de {existenciasFiltradas.length} resultados
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPagina(pagina - 1)}
                disabled={pagina === 1}
                className="!p-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-30 cursor-pointer flex items-center justify-center !bg-white"
              >
                <span className="material-symbols-outlined text-lg !text-slate-500">chevron_left</span>
              </button>
              {Array.from({ length: totalPaginas }).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPagina(i + 1)}
                  className={`px-3 py-1 border rounded text-xs font-bold cursor-pointer transition-colors ${pagina === i + 1 ? '!bg-[#00327d] !text-white border-[#00327d]' : '!bg-white border-slate-200 hover:bg-slate-50 !text-slate-600'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPagina(pagina + 1)}
                disabled={pagina === totalPaginas}
                className="!p-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-30 cursor-pointer flex items-center justify-center !bg-white"
              >
                <span className="material-symbols-outlined text-lg !text-slate-500">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Visualization Section (Bento Bottom) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Movements Activity Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-64 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-[#00327d] text-sm uppercase tracking-wider">Actividad de Movimientos</h3>
            <span className="text-xs text-slate-400 flex items-center gap-1 font-bold">Últimos 7 días <span className="material-symbols-outlined text-xs">info</span></span>
          </div>
          <div className="flex-1 flex items-end gap-4 px-2 pb-2 h-full">
            {weeklyData.map((day, idx) => (
              <div key={idx} className="w-full flex flex-col justify-end items-center h-full group">
                <div
                  style={{ height: day.height }}
                  className={`w-full rounded-t transition-all cursor-help relative ${day.value > 0 ? 'bg-[#00327d] hover:bg-[#0047ab]' : 'bg-slate-100'}`}
                >
                  {day.value > 0 && (
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#00327d] text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                      {Math.round(day.value)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs font-bold text-slate-400 px-1 border-t border-slate-100 pt-2">
            <span>L</span>
            <span>M</span>
            <span>X</span>
            <span>J</span>
            <span>V</span>
            <span>S</span>
            <span>D</span>
          </div>
        </div>

        {/* Quick Action List / Recent Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-[#00327d] text-sm uppercase tracking-wider mb-4">Alertas</h3>
            <div className="space-y-3">
              {/* Alertas críticas del inventario */}
              {existencias.filter(e => e.bajoMinimo).slice(0, 2).map(e => (
                <div key={e.id} className="flex gap-3 p-2 hover:bg-slate-50 rounded transition-colors cursor-pointer border border-[#ffb4ab] bg-[#ffdad6]/20" onClick={() => abrirModal(e)}>
                  <span className="material-symbols-outlined text-[#bb0014] shrink-0 text-xl">warning</span>
                  <div>
                    <p className="text-xs font-bold leading-tight text-[#bb0014]">Stock bajo: {e.producto.sku}</p>
                    <p className="text-xs text-slate-500 mt-1">Quedan {e.cantidad} {e.producto.unidadMedida} • {e.almacen.nombre}</p>
                  </div>
                </div>
              ))}

              {/* Movimientos recientes */}
              {movimientos.slice(0, 2).map(m => (
                <div key={m.id} className="flex gap-3 p-2 hover:bg-slate-50 rounded transition-colors cursor-pointer border border-[#b1c5ff] bg-[#e7eeff]/10" onClick={() => navigate('/movimientos')}>
                  <span className={`material-symbols-outlined shrink-0 text-xl ${m.tipo === 'Entrada' ? 'text-emerald-600' : m.tipo === 'Salida' ? 'text-[#bb0014]' : 'text-[#00327d]'}`}>
                    {m.tipo === 'Entrada' ? 'local_shipping' : m.tipo === 'Salida' ? 'outbox' : 'swap_horiz'}
                  </span>
                  <div>
                    <p className="text-xs font-bold leading-tight text-slate-700">
                      {m.tipo} registrada
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatRelativeTime(m.fecha)} • {m.producto.sku} ({m.cantidad} uds)
                    </p>
                  </div>
                </div>
              ))}

              {existencias.filter(e => e.bajoMinimo).length === 0 && movimientos.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No hay alertas ni movimientos recientes.</p>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/movimientos')}
            className="w-full mt-4 text-[#00327d] font-bold text-xs border-t border-slate-100 pt-3 hover:underline cursor-pointer text-center"
          >
            Ver todos los movimientos
          </button>
        </div>
      </section>

      {modalStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 mx-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-[#3755c3] bg-blue-50 p-2 rounded-full">edit_note</span>
              <h3 className="text-sm font-bold text-[#001f51] uppercase tracking-wider">Ajustar Stock Mínimo</h3>
            </div>
            
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Establece el nivel de alerta para <strong>{modalStock.producto.nombre}</strong> en el almacén <strong>{modalStock.almacen.nombre}</strong>.
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!modalStock) return
              try {
                await api(`/api/existencias/${modalStock.id}/stock-minimo`, {
                  method: 'PUT',
                  body: JSON.stringify(Number(nuevoMinimo)),
                })
                setModalStock(null)
                await cargarExistencias()
              } catch (err: any) {
                setError(err.message)
              }
            }}>
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">CANTIDAD MÍNIMA DE ALERTA</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={nuevoMinimo}
                  onChange={e => setNuevoMinimo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#3755c3] focus:ring-1 focus:ring-[#3755c3] transition-all"
                  placeholder="Ej. 10"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalStock(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-colors cursor-pointer !bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#001f51] hover:bg-[#00337c] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
