import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/cliente'
import type { Almacen, ResumenDashboard } from '../api/tipos'

export default function Dashboard() {
  const [data, setData] = useState<ResumenDashboard | null>(null)
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [almacenId, setAlmacenId] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const [cargandoInicial, setCargandoInicial] = useState(true)
  const [recargando, setRecargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Almacen[]>('/api/almacenes').then(setAlmacenes).catch(() => {})
  }, [])

  const cargarDashboard = (esInicial = false) => {
    if (esInicial || !data) {
      setCargandoInicial(true)
    } else {
      setRecargando(true)
    }
    setError('')

    const params = new URLSearchParams()
    if (almacenId) params.set('almacenId', almacenId)
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', `${hasta}T23:59:59`)

    api<ResumenDashboard>(`/api/dashboard/resumen?${params}`)
      .then(d => {
        setData(d)
        setCargandoInicial(false)
        setRecargando(false)
      })
      .catch(err => {
        setError(err.message)
        setCargandoInicial(false)
        setRecargando(false)
      })
  }

  useEffect(() => {
    cargarDashboard(!data)
  }, [almacenId, desde, hasta])

  const setFiltroRapido = (dias: number) => {
    const h = new Date()
    const d = new Date()
    d.setDate(h.getDate() - dias + 1)
    
    setDesde(d.toISOString().split('T')[0])
    setHasta(h.toISOString().split('T')[0])
  }

  if (cargandoInicial && !data) {
    return (
      <div className="p-12 text-center text-slate-500">
        <span className="material-symbols-outlined text-4xl animate-spin text-[#3755c3] mb-2 block">progress_activity</span>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Cargando...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
        <p className="font-bold mb-2">Error al cargar datos del Dashboard Ejecutivo:</p>
        <p>{error || 'No se pudieron recuperar las métricas.'}</p>
        <button
          onClick={() => cargarDashboard(true)}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const { kpis, entradasVsSalidas, topInsumos, distribucionAlmacenes, estadoLogistica, ultimosMovimientos } = data

  // Max value for scaling bar chart
  const maxMov = Math.max(1, ...entradasVsSalidas.flatMap(d => [d.entradas, d.salidas]))
  const maxInsumo = Math.max(1, ...topInsumos.map(i => i.totalSalidas))
  const totalStockAlmacenes = Math.max(1, distribucionAlmacenes.reduce((acc, a) => acc + a.totalStock, 0))

  return (
    <div className={`space-y-8 transition-opacity duration-200 ${recargando ? 'opacity-70' : 'opacity-100'}`}>
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#001f51] to-[#3755c3] p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-400/20 text-blue-300 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-blue-400/30">
              Control Gerencial
            </span>
            <span className="text-slate-300 text-xs">• {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard Ejecutivo OVOPLUS</h1>
          <p className="text-xs text-blue-200 mt-1 max-w-xl">
            Indicadores clave de rendimiento, rotación de materia prima, rotación de lotes (FEFO) y matriz logística.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => cargarDashboard(false)}
            disabled={recargando}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl backdrop-blur-xs border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-base ${recargando ? 'animate-spin' : ''}`}>refresh</span>
            <span>{recargando ? 'Cargando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar Controls */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Filtro Almacén */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Almacén</label>
            <select
              value={almacenId}
              onChange={e => setAlmacenId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-[#001f51] outline-none focus:border-[#3755c3] cursor-pointer"
            >
              <option value="">Todos los almacenes</option>
              {almacenes.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          {/* Fecha Desde */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={e => setDesde(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3]"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3]"
            />
          </div>
        </div>

        {/* Filtros Rápidos & Limpiar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setFiltroRapido(7)}
            className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
          >
            Últimos 7d
          </button>
          <button
            type="button"
            onClick={() => setFiltroRapido(30)}
            className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
          >
            Últimos 30d
          </button>
          {(almacenId || desde || hasta) && (
            <button
              type="button"
              onClick={() => { setAlmacenId(''); setDesde(''); setHasta(''); }}
              className="px-2.5 py-2 bg-red-50 text-red-600 hover:bg-red-100 text-[11px] font-bold rounded-lg transition-colors cursor-pointer border border-red-100"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* 1. TOP 4 BENTO KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Insumos Registrados */}
        <Link to="/productos" className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Insumos</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#3755c3] flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-lg">inventory_2</span>
            </div>
          </div>
          <div className="text-3xl font-black text-[#001f51]">{kpis.totalProductos}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Catálogo activo en {kpis.totalAlmacenes} almacenes
          </div>
        </Link>

        {/* KPI 2: Stock Crítico */}
        <Link to="/existencias" className={`p-5 bg-white border rounded-xl shadow-xs hover:shadow-md transition-all group ${kpis.alertasStockCount > 0 ? 'border-red-200 bg-red-50/20' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stock Crítico</span>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${kpis.alertasStockCount > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-600'}`}>
              <span className="material-symbols-outlined text-lg">warning</span>
            </div>
          </div>
          <div className={`text-3xl font-black ${kpis.alertasStockCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {kpis.alertasStockCount}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            {kpis.alertasStockCount > 0 ? '⚠️ Insumos bajo stock mínimo' : '✓ Todos con stock de seguridad'}
          </div>
        </Link>

        {/* KPI 3: Lotes Próximos a Vencer (FEFO) */}
        <Link to="/reportes" className={`p-5 bg-white border rounded-xl shadow-xs hover:shadow-md transition-all group ${kpis.alertasVencimientoCount > 0 ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vencimientos FEFO</span>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${kpis.alertasVencimientoCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-[#3755c3]'}`}>
              <span className="material-symbols-outlined text-lg">event_busy</span>
            </div>
          </div>
          <div className={`text-3xl font-black ${kpis.alertasVencimientoCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
            {kpis.alertasVencimientoCount}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            {kpis.alertasVencimientoCount > 0 ? '⏳ Lotes vencen en < 30 días' : '✓ Sin vencimientos próximos'}
          </div>
        </Link>

        {/* KPI 4: Despachos Logística Choferes */}
        <Link to="/logistica-choferes" className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Despachos Pendientes</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-lg">local_shipping</span>
            </div>
          </div>
          <div className="text-3xl font-black text-indigo-900">{kpis.tareasPendientesCount}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Tareas asignadas a choferes
          </div>
        </Link>
      </div>

      {/* 2. CHARTS SECTION (ROW 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Entradas vs Salidas (7 Días) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-extrabold text-[#001f51] uppercase tracking-wider">
                Flujo de Entradas vs. Salidas
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Movimientos diarios de los últimos 7 días</p>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block"></span>
                <span className="text-slate-600">Entradas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block"></span>
                <span className="text-slate-600">Salidas</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Bars */}
          <div className="h-64 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
            {entradasVsSalidas.map((item, idx) => {
              const altEntrada = (item.entradas / maxMov) * 180
              const altSalida = (item.salidas / maxMov) * 180

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-slate-900 text-white text-[10px] p-2 rounded-lg pointer-events-none shadow-lg z-20 whitespace-nowrap">
                    <div>Entradas: <strong>{item.entradas}</strong></div>
                    <div>Salidas: <strong>{item.salidas}</strong></div>
                  </div>

                  <div className="w-full flex items-end justify-center gap-1.5 h-48">
                    {/* Entrada Bar */}
                    <div
                      style={{ height: `${Math.max(4, altEntrada)}px` }}
                      className="w-1/2 bg-emerald-500 hover:bg-emerald-600 rounded-t transition-all"
                      title={`Entradas: ${item.entradas}`}
                    />
                    {/* Salida Bar */}
                    <div
                      style={{ height: `${Math.max(4, altSalida)}px` }}
                      className="w-1/2 bg-amber-500 hover:bg-amber-600 rounded-t transition-all"
                      title={`Salidas: ${item.salidas}`}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">{item.fecha}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Chart 2: Top 5 Insumos Mas Consumidos */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[#001f51] uppercase tracking-wider mb-1">
              Top Insumos Consumidos
            </h2>
            <p className="text-xs text-slate-400 font-medium mb-6">Salidas acumuladas en los últimos 30 días</p>

            <div className="space-y-4">
              {topInsumos.length > 0 ? (
                topInsumos.map((ins, idx) => {
                  const pct = Math.round((ins.totalSalidas / maxInsumo) * 100)
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-800 truncate max-w-[180px]" title={ins.productoNombre}>
                          {ins.productoNombre}
                        </span>
                        <span className="text-[#3755c3] font-bold">
                          {ins.totalSalidas} {ins.unidadMedida}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-gradient-to-r from-blue-600 to-[#3755c3] rounded-full transition-all"
                        />
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  Sin registros de salidas en los últimos 30 días.
                </div>
              )}
            </div>
          </div>

          <Link
            to="/reportes"
            className="mt-6 text-center text-xs font-bold text-[#3755c3] hover:underline block pt-3 border-t border-slate-100"
          >
            Ver reporte de Kardex completo ➔
          </Link>
        </div>
      </div>

      {/* 3. OPERATIONAL BREAKDOWN (ROW 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por Almacén */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <h2 className="text-sm font-extrabold text-[#001f51] uppercase tracking-wider mb-1">
            Distribución de Stock por Almacén
          </h2>
          <p className="text-xs text-slate-400 font-medium mb-5">Concentración de existencias totales</p>

          <div className="space-y-3">
            {distribucionAlmacenes.map((alm, idx) => {
              const pct = Math.round((alm.totalStock / totalStockAlmacenes) * 100)
              return (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#3755c3] font-bold text-xs flex items-center justify-center shrink-0">
                      A{idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{alm.almacenNombre}</div>
                      <div className="text-[11px] text-slate-400 font-medium">{alm.totalStock} unidades acumuladas</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-[#001f51]">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Rendimiento Logístico de Choferes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[#001f51] uppercase tracking-wider mb-1">
              Cumplimiento Logístico de Choferes
            </h2>
            <p className="text-xs text-slate-400 font-medium mb-5">Estado de tareas de despacho y distribución</p>

            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <span className="text-xl font-black text-amber-700 block">{estadoLogistica.pendientes}</span>
                <span className="text-[10px] font-bold uppercase text-amber-800">Pendientes</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-xl font-black text-blue-700 block">{estadoLogistica.enTransito}</span>
                <span className="text-[10px] font-bold uppercase text-blue-800">En Ruta</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-xl font-black text-emerald-700 block">{estadoLogistica.entregadas}</span>
                <span className="text-[10px] font-bold uppercase text-emerald-800">Entregadas</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="text-xs">
                <span className="font-bold text-slate-700 block">Eficiencia de Entregas</span>
                <span className="text-[11px] text-slate-400">Total de despachos programados: {estadoLogistica.total}</span>
              </div>
              <span className="text-xl font-black text-emerald-600">
                {estadoLogistica.total > 0 ? Math.round((estadoLogistica.entregadas / estadoLogistica.total) * 100) : 100}%
              </span>
            </div>
          </div>

          <Link
            to="/logistica-choferes"
            className="mt-6 text-center text-xs font-bold text-[#3755c3] hover:underline block pt-3 border-t border-slate-100"
          >
            Ir a Matriz Logística de Choferes ➔
          </Link>
        </div>
      </div>

      {/* 4. ULTIMOS MOVIMIENTOS RECIENTES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-extrabold text-[#001f51] uppercase tracking-wider">
              Movimientos Recientes en Planta
            </h2>
            <p className="text-xs text-slate-400 font-medium">Últimas transacciones registradas</p>
          </div>
          <Link to="/movimientos" className="text-xs font-bold text-[#3755c3] hover:underline">
            Registrar movimiento ➔
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left divide-y divide-slate-100 text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                <th className="p-3">FECHA</th>
                <th className="p-3">TIPO</th>
                <th className="p-3">INSUMO</th>
                <th className="p-3 text-right">CANTIDAD</th>
                <th className="p-3">ORIGEN / DESTINO</th>
                <th className="p-3">OPERADOR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ultimosMovimientos.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-slate-500 font-medium whitespace-nowrap">
                    {new Date(m.fecha).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${m.tipo === 'Entrada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : m.tipo === 'Salida' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-slate-800">
                    {m.productoNombre} <span className="text-slate-400 text-[10px]">({m.sku})</span>
                  </td>
                  <td className="p-3 text-right font-bold text-slate-800">
                    {m.cantidad} {m.unidadMedida}
                  </td>
                  <td className="p-3 text-slate-500">
                    {m.almacenOrigen || m.almacenDestino || 'Almacén Central'}
                  </td>
                  <td className="p-3 text-slate-400 font-medium">
                    {m.usuario}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
