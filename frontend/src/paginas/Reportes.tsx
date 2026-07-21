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
  const [tab, setTab] = useState<'historial' | 'auditoria' | 'kardex'>('kardex')
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  
  // Filtros Historial
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [productoId, setProductoId] = useState('')
  const [almacenId, setAlmacenId] = useState('')
  
  // Filtros Kardex Físico
  const [kardexProductoId, setKardexProductoId] = useState('')
  const [kardexAlmacenId, setKardexAlmacenId] = useState('')
  const [kardexDesde, setKardexDesde] = useState('')
  const [kardexHasta, setKardexHasta] = useState('')
  const [movimientosKardex, setMovimientosKardex] = useState<Movimiento[]>([])

  // Auditoría / Toma
  const [auditoriaAlmacenId, setAuditoriaAlmacenId] = useState('')
  const [planilla, setPlanilla] = useState<FilaInventario[]>([])
  
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [cargando, setCargando] = useState(false)

  // Cargar catálogos y seleccionar primer producto por defecto para Kardex
  useEffect(() => {
    api<Producto[]>('/api/productos').then(p => {
      setProductos(p)
      if (p.length > 0 && !kardexProductoId) {
        setKardexProductoId(String(p[0].id))
      }
    }).catch(e => setError(e.message))
    api<Almacen[]>('/api/almacenes').then(setAlmacenes).catch(e => setError(e.message))
  }, [])

  // Cargar movimientos para Kardex Físico (Ordenados cronológicamente Ascendente)
  useEffect(() => {
    if (tab === 'kardex' && kardexProductoId) {
      const params = new URLSearchParams()
      params.set('productoId', kardexProductoId)
      if (kardexAlmacenId) params.set('almacenId', kardexAlmacenId)
      if (kardexDesde) params.set('desde', kardexDesde)
      if (kardexHasta) params.set('hasta', `${kardexHasta}T23:59:59`)

      api<Movimiento[]>(`/api/movimientos?${params}`)
        .then(data => {
          // Ordenar de más antiguo a más reciente para calcular el saldo acumulado
          const listaAsc = [...data].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
          setMovimientosKardex(listaAsc)
        })
        .catch(e => setError(e.message))
    }
  }, [kardexProductoId, kardexAlmacenId, kardexDesde, kardexHasta, tab])

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
        const existMap = new Map<number, number>()
        existencias.forEach(e => existMap.set(e.producto.id, e.cantidad))
        
        const selectedAlmacen = almacenes.find(a => String(a.id) === auditoriaAlmacenId)
        const filas: FilaInventario[] = todosProductos.map(p => ({
          productoId: p.id,
          sku: p.sku,
          nombre: p.nombre,
          imagenUrl: p.imagenUrl,
          unidadMedida: p.unidadMedida,
          stockSistema: existMap.get(p.id) ?? 0,
          stockFisico: '',
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
    
    if (!auditoriaAlmacenId) {
      setError('Debes seleccionar un almacén para aplicar los ajustes.')
      return
    }

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
        if (diferencia === 0) continue

        const payload = {
          productoId: fila.productoId,
          cantidad: Math.abs(diferencia),
          nota: `Ajuste por Auditoría de Inventario Físico (Planilla)`,
          almacenOrigenId: diferencia < 0 ? Number(auditoriaAlmacenId) : null,
          almacenDestinoId: diferencia > 0 ? Number(auditoriaAlmacenId) : null
        }

        const endpoint = diferencia > 0 ? '/api/movimientos/entrada' : '/api/movimientos/salida'
        await api(endpoint, {
          method: 'POST',
          body: JSON.stringify(payload)
        })
        totalModificados++
      }

      setExito(`Ajustes aplicados con éxito. Se realizaron ${totalModificados} movimientos de ajuste.`)
      setAuditoriaAlmacenId('')
      setTimeout(() => setAuditoriaAlmacenId(auditoriaAlmacenId), 100)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  function imprimirPlanilla() {
    window.print()
  }

  // Exportar Kardex a Excel (.csv con UTF-8 BOM)
  const kardexProductoSel = productos.find(p => String(p.id) === kardexProductoId)
  
  // Calcular saldo acumulado
  let saldoAcumulado = 0
  const filasKardex = movimientosKardex.map(m => {
    const esEntrada = m.tipo === 'Entrada'
    const esSalida = m.tipo === 'Salida'
    let ingreso: number | null = null
    let salida: number | null = null
    let devolucion: number | null = null
    
    if (esEntrada) {
      ingreso = m.cantidad
      saldoAcumulado += m.cantidad
    } else if (esSalida) {
      salida = m.cantidad
      saldoAcumulado -= m.cantidad
    } else {
      ingreso = m.cantidad
      saldoAcumulado += m.cantidad
    }

    return {
      id: m.id,
      fecha: m.fecha,
      destinoOrigen: esEntrada ? (m.almacenDestino || 'Almacén Central') : (m.almacenOrigen || 'Planta'),
      ingreso,
      salida,
      devolucion,
      saldo: saldoAcumulado,
      responsable: m.usuario,
      observaciones: m.nota || '',
      lote: m.numeroLote
    }
  })

  function exportarExcelKardex() {
    if (!kardexProductoSel) return
    
    const headers = ['FECHA', 'DESTINO / ORIGEN', 'INGRESO', 'SALIDA', 'DEVOLUCION', 'SALDO', 'RESPONSABLE', 'OBSERVACIONES']
    const rows = filasKardex.map(f => [
      `"${new Date(f.fecha).toLocaleDateString()} ${new Date(f.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}"`,
      `"${(f.destinoOrigen || '').replace(/"/g, '""')}"`,
      f.ingreso ?? '',
      f.salida ?? '',
      f.devolucion ?? '',
      f.saldo,
      `"${(f.responsable || '').replace(/"/g, '""')}"`,
      `"${(f.observaciones || '').replace(/"/g, '""')}"`
    ])
    
    const csvContent = '\uFEFF' + [
      `"KARDEX MATERIA PRIMA , INSUMOS Y EMPAQUE - OVOPLUS"`,
      `"ITEM: ${kardexProductoSel.nombre}"`,
      `"UNIDAD DE MEDIDA: ${kardexProductoSel.unidadMedida}"`,
      `"ALMACEN: ${almacenes.find(a => String(a.id) === kardexAlmacenId)?.nombre || 'Todos los almacenes'}"`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Kardex_${kardexProductoSel.sku}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      {/* CSS para Impresión de Kardex Físico Estilo Cuaderno */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          nav, aside, header, footer, button, .no-print {
            display: none !important;
          }
          body, main, .print-container {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            color: black !important;
          }
          .kardex-print-book {
            display: block !important;
            width: 100% !important;
            border: 2px solid #000 !important;
            padding: 15px !important;
            font-family: system-ui, sans-serif !important;
          }
          .kardex-print-book table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
          }
          .kardex-print-book th, .kardex-print-book td {
            border: 1px solid #000 !important;
            padding: 6px 8px !important;
            font-size: 11px !important;
          }
          .kardex-print-book th {
            background-color: #f0f4f8 !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
          }
        }
        .kardex-print-book {
          display: none;
        }
      `}</style>

      {/* Bloque de Impresión Nativa (Solo visible al Imprimir) */}
      {kardexProductoSel && (
        <div className="kardex-print-book">
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-black tracking-tighter text-blue-900 border-2 border-black px-2 py-0.5 rounded">
                OVO<span className="text-blue-600">Φ</span>LUS
              </div>
              <div>
                <h1 className="text-lg font-black uppercase tracking-wider leading-tight">
                  KARDEX MATERIA PRIMA , INSUMOS Y EMPAQUE {new Date().getFullYear()}
                </h1>
                <p className="text-[10px] uppercase font-bold text-slate-600">ROLON - INDUSTRIA ALIMENTICIA</p>
              </div>
            </div>
            <div className="text-right text-xs">
              <div><strong>FECHA IMPRESIÓN:</strong> {new Date().toLocaleDateString()}</div>
              <div><strong>ALMACÉN:</strong> {almacenes.find(a => String(a.id) === kardexAlmacenId)?.nombre || 'TODOS'}</div>
            </div>
          </div>

          <div className="bg-slate-100 p-2.5 border border-black text-xs font-bold mb-3 flex justify-between items-center">
            <div><strong>ITEM:</strong> {kardexProductoSel.nombre.toUpperCase()} ({kardexProductoSel.sku})</div>
            <div><strong>UNIDAD DE MEDIDA:</strong> {kardexProductoSel.unidadMedida}</div>
            <div><strong>SALDO ACTUAL:</strong> {saldoAcumulado} {kardexProductoSel.unidadMedida}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style={{ width: '90px' }}>FECHA</th>
                <th>DESTINO / ORIGEN</th>
                <th style={{ width: '70px', textAlign: 'right' }}>INGRESO</th>
                <th style={{ width: '70px', textAlign: 'right' }}>SALIDA</th>
                <th style={{ width: '70px', textAlign: 'right' }}>DEVOLUCIÓN</th>
                <th style={{ width: '80px', textAlign: 'right' }}>SALDO</th>
                <th style={{ width: '100px' }}>NOMBRE</th>
                <th style={{ width: '90px' }}>FIRMA</th>
                <th>OBSERVACIONES</th>
              </tr>
            </thead>
            <tbody>
              {filasKardex.map((f, i) => (
                <tr key={i}>
                  <td>{new Date(f.fecha).toLocaleDateString()}</td>
                  <td>{f.destinoOrigen}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{f.ingreso ?? ''}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{f.salida ?? ''}</td>
                  <td style={{ textAlign: 'right' }}>{f.devolucion ?? ''}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'extrabold', backgroundColor: '#f8fafc' }}>{f.saldo}</td>
                  <td>{f.responsable}</td>
                  <td style={{ height: '30px' }}></td>
                  <td>{f.observaciones} {f.lote ? `(Lote: ${f.lote})` : ''}</td>
                </tr>
              ))}
              {/* Filas vacías adicionales para completar el libro impreso si es corto */}
              {Array.from({ length: Math.max(0, 15 - filasKardex.length) }).map((_, idx) => (
                <tr key={`empty-${idx}`}>
                  <td style={{ height: '28px' }}></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="no-print">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-headline-lg text-headline-lg text-[#001f51] font-bold">Reportes y Kardex Físico</h1>
          <p className="font-body-md text-body-md text-slate-500 mt-2 max-w-2xl">
            Genera e imprime el Kardex oficial de materias primas e insumos con el formato exacto del cuaderno de planta.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 border-b border-slate-200 mb-8 bg-white p-2 rounded-xl shadow-sm w-fit flex-wrap">
          <button
            onClick={() => { setTab('kardex'); setError(''); setExito(''); }}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${tab === 'kardex' ? 'bg-[#001f51] text-white shadow-sm' : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined text-base">menu_book</span>
            <span>Kardex Físico (Cuaderno)</span>
          </button>
          <button
            onClick={() => { setTab('historial'); setError(''); setExito(''); }}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${tab === 'historial' ? 'bg-[#001f51] text-white shadow-sm' : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined text-base">history</span>
            <span>Historial de Movimientos</span>
          </button>
          <button
            onClick={() => { setTab('auditoria'); setError(''); setExito(''); }}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${tab === 'auditoria' ? 'bg-[#001f51] text-white shadow-sm' : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined text-base">checklist</span>
            <span>Toma de Inventario Físico</span>
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

      {/* TAB 0: KARDEX FÍSICO CUADERNO (OVOPLUS) */}
      {tab === 'kardex' && (
        <div className="space-y-6 print-container">
          {/* Controls & Filter Card */}
          <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm no-print">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6">
              <div>
                <h3 className="text-xs font-bold text-[#3755c3] uppercase tracking-widest mb-1">Configuración de Libro Kardex</h3>
                <p className="text-xs text-slate-500">Selecciona el insumo y filtros para ver la planilla idéntica al cuaderno de planta.</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={exportarExcelKardex}
                  disabled={!kardexProductoSel || filasKardex.length === 0}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">table_view</span>
                  <span>Exportar a Excel</span>
                </button>

                <button
                  type="button"
                  onClick={imprimirPlanilla}
                  disabled={!kardexProductoSel}
                  className="px-4 py-2.5 bg-[#001f51] hover:bg-[#00337c] text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  <span>Imprimir Kardex (PDF)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 border-t border-slate-100 pt-4">
              {/* Product Select */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-tighter">
                  Seleccionar Ítem / Producto *
                </label>
                <select
                  value={kardexProductoId}
                  onChange={e => setKardexProductoId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-[#001f51] outline-none focus:border-[#3755c3] transition-all cursor-pointer"
                >
                  <option value="">-- Seleccionar Insumo --</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.nombre} ({p.unidadMedida})
                    </option>
                  ))}
                </select>
              </div>

              {/* Warehouse Select */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-tighter">Almacén</label>
                <select
                  value={kardexAlmacenId}
                  onChange={e => setKardexAlmacenId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all cursor-pointer"
                >
                  <option value="">Todos los almacenes</option>
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Date Filters */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-tighter">Período (Desde / Hasta)</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={kardexDesde}
                    onChange={e => setKardexDesde(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] outline-none focus:border-[#3755c3]"
                  />
                  <input
                    type="date"
                    value={kardexHasta}
                    onChange={e => setKardexHasta(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] outline-none focus:border-[#3755c3]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Book Preview Table */}
          {kardexProductoSel ? (
            <div className="bg-white border-2 border-slate-800 rounded-xl shadow-md overflow-hidden">
              {/* Header Badge */}
              <div className="p-6 border-b-2 border-slate-800 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#3755c3] text-white flex items-center justify-center font-black text-sm border border-white/20">
                    OP
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-wider text-white">
                      KARDEX MATERIA PRIMA , INSUMOS Y EMPAQUE 2026
                    </h2>
                    <p className="text-[11px] text-blue-200 font-semibold uppercase tracking-widest">OVOPLUS - ROLON INDUSTRIA ALIMENTICIA</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs bg-white/10 px-4 py-2 rounded-lg border border-white/10">
                  <div>
                    <span className="text-slate-300 block text-[10px] uppercase">Ítem Seleccionado</span>
                    <strong className="text-white font-bold">{kardexProductoSel.nombre}</strong>
                  </div>
                  <div className="h-6 w-px bg-white/20"></div>
                  <div>
                    <span className="text-slate-300 block text-[10px] uppercase">Saldo Actual</span>
                    <strong className="text-emerald-300 font-black text-sm">{saldoAcumulado} {kardexProductoSel.unidadMedida}</strong>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-300 text-slate-700">
                    <tr>
                      <th className="p-3 text-[11px] font-extrabold uppercase border-r border-slate-200">FECHA</th>
                      <th className="p-3 text-[11px] font-extrabold uppercase border-r border-slate-200">DESTINO / ORIGEN</th>
                      <th className="p-3 text-[11px] font-extrabold uppercase border-r border-slate-200 text-right text-emerald-700">INGRESO</th>
                      <th className="p-3 text-[11px] font-extrabold uppercase border-r border-slate-200 text-right text-amber-700">SALIDA</th>
                      <th className="p-3 text-[11px] font-extrabold uppercase border-r border-slate-200 text-right text-blue-700">DEVOLUCIÓN</th>
                      <th className="p-3 text-[11px] font-black uppercase border-r border-slate-300 text-right bg-blue-50 text-[#001f51]">SALDO</th>
                      <th className="p-3 text-[11px] font-extrabold uppercase border-r border-slate-200">NOMBRE</th>
                      <th className="p-3 text-[11px] font-extrabold uppercase border-r border-slate-200 text-center">FIRMA</th>
                      <th className="p-3 text-[11px] font-extrabold uppercase">OBSERVACIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filasKardex.length > 0 ? (
                      filasKardex.map((f, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 border-r border-slate-200 font-medium text-slate-600 whitespace-nowrap">
                            {new Date(f.fecha).toLocaleDateString()}
                          </td>
                          <td className="p-3 border-r border-slate-200 font-semibold text-slate-800">
                            {f.destinoOrigen}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-right font-extrabold text-emerald-700">
                            {f.ingreso ?? '—'}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-right font-extrabold text-amber-700">
                            {f.salida ?? '—'}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-right font-bold text-blue-700">
                            {f.devolucion ?? '—'}
                          </td>
                          <td className="p-3 border-r border-slate-300 text-right font-black text-sm bg-blue-50/70 text-[#001f51]">
                            {f.saldo}
                          </td>
                          <td className="p-3 border-r border-slate-200 font-medium text-slate-700">
                            {f.responsable}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-center">
                            <span className="inline-block w-16 border-b border-slate-300 h-4"></span>
                          </td>
                          <td className="p-3 text-slate-500 italic">
                            {f.observaciones || '—'} {f.lote ? <span className="not-italic font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] ml-1">Lote: {f.lote}</span> : ''}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 text-xs font-semibold">
                          No se registran movimientos para este producto en el rango seleccionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-xl shadow-sm no-print">
              <span className="material-symbols-outlined text-slate-300 text-5xl mb-3">menu_book</span>
              <p className="text-sm font-semibold text-slate-500">Selecciona un producto arriba para visualizar y generar su libro Kardex.</p>
            </div>
          )}
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
