import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/cliente'
import type { Almacen, TareaLogistica, UsuarioLista } from '../api/tipos'
import { useAuth } from '../auth/AuthContext'

const HORAS_JORNADA = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
]

export default function LogisticaChoferes() {
  const { sesion } = useAuth()
  const esChofer = sesion?.rol === 'Chofer'
  const puedeAsignar = sesion?.rol === 'Admin' || sesion?.rol === 'Encargado' || sesion?.rol === 'Almacenero'

  const getTodayLocalStr = () => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const sumarDiasLocal = (fechaYMD: string, offset: number) => {
    const parts = fechaYMD.split('-').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) return fechaYMD
    const [y, m, d] = parts
    const dt = new Date(y, m - 1, d + offset)
    const newY = dt.getFullYear()
    const newM = String(dt.getMonth() + 1).padStart(2, '0')
    const newD = String(dt.getDate()).padStart(2, '0')
    return `${newY}-${newM}-${newD}`
  }

  const todayStr = getTodayLocalStr()
  const [fechaFiltro, setFechaFiltro] = useState<string>(todayStr)
  const [vista, setVista] = useState<'matriz' | 'tarjetas'>('matriz')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

  const [tareas, setTareas] = useState<TareaLogistica[]>([])
  const [choferes, setChoferes] = useState<UsuarioLista[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])

  // Form estado para nueva tarea
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [choferId, setChoferId] = useState('')
  const [origenId, setOrigenId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [fechaProgramada, setFechaProgramada] = useState(todayStr)
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFin, setHoraFin] = useState('09:00')

  // Modal para completar tarea (Chofer)
  const [modalTarea, setModalTarea] = useState<TareaLogistica | null>(null)
  const [notasChoferInput, setNotasChoferInput] = useState('')
  const [comprobanteUrlInput, setComprobanteUrlInput] = useState('')
  const [subiendoComprobante, setSubiendoComprobante] = useState(false)

  // Modal para editar tarea (Admin / Encargado / Almacenero)
  const [tareaEditando, setTareaEditando] = useState<TareaLogistica | null>(null)
  const [editTitulo, setEditTitulo] = useState('')
  const [editDescripcion, setEditDescripcion] = useState('')
  const [editChoferId, setEditChoferId] = useState('')
  const [editOrigenId, setEditOrigenId] = useState('')
  const [editDestinoId, setEditDestinoId] = useState('')
  const [editFechaProgramada, setEditFechaProgramada] = useState('')
  const [editHoraInicio, setEditHoraInicio] = useState('08:00')
  const [editHoraFin, setEditHoraFin] = useState('09:00')

  // Modal para confirmar eliminación (Premium)
  const [idTareaAEliminar, setIdTareaAEliminar] = useState<number | null>(null)

  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [cargando, setCargando] = useState(false)

  const cargarDatos = async () => {
    try {
      const dataTareas = await api<TareaLogistica[]>('/api/tareas-logistica')
      setTareas(dataTareas)

      if (puedeAsignar) {
        const dataUsuarios = await api<UsuarioLista[]>('/api/usuarios')
        setChoferes(dataUsuarios.filter(u => u.rol === 'Chofer' && u.activo))
        const dataAlmacenes = await api<Almacen[]>('/api/almacenes')
        setAlmacenes(dataAlmacenes.filter(a => a.activo))
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [sesion])

  const handleCrearTarea = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setExito('')
    if (!choferId) {
      setError('Debes seleccionar un chofer para la tarea.')
      return
    }
    setCargando(true)
    try {
      await api('/api/tareas-logistica', {
        method: 'POST',
        body: JSON.stringify({
          titulo,
          descripcion: descripcion || null,
          choferId: Number(choferId),
          almacenOrigenId: origenId ? Number(origenId) : null,
          almacenDestinoId: destinoId ? Number(destinoId) : null,
          fechaProgramada,
          horaInicio,
          horaFin,
        }),
      })
      setExito('Tarea programada y asignada al chofer con éxito.')
      setTitulo('')
      setDescripcion('')
      setOrigenId('')
      setDestinoId('')
      await cargarDatos()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  const abrirModalEditar = (t: TareaLogistica) => {
    setTareaEditando(t)
    setEditTitulo(t.titulo)
    setEditDescripcion(t.descripcion || '')
    setEditChoferId(String(t.choferId))
    setEditOrigenId(t.almacenOrigenId ? String(t.almacenOrigenId) : '')
    setEditDestinoId(t.almacenDestinoId ? String(t.almacenDestinoId) : '')
    setEditFechaProgramada(t.fechaProgramada)
    setEditHoraInicio(t.horaInicio)
    setEditHoraFin(t.horaFin)
  }

  const handleGuardarEdicion = async (e: FormEvent) => {
    e.preventDefault()
    if (!tareaEditando) return
    setError('')
    setExito('')
    setCargando(true)
    try {
      await api(`/api/tareas-logistica/${tareaEditando.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          titulo: editTitulo,
          descripcion: editDescripcion || null,
          choferId: Number(editChoferId),
          almacenOrigenId: editOrigenId ? Number(editOrigenId) : null,
          almacenDestinoId: editDestinoId ? Number(editDestinoId) : null,
          fechaProgramada: editFechaProgramada,
          horaInicio: editHoraInicio,
          horaFin: editHoraFin,
        }),
      })
      setExito('Tarea actualizada correctamente.')
      setTareaEditando(null)
      await cargarDatos()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  const handleSubirComprobante = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]
    setSubiendoComprobante(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api<{ url: string }>('/api/archivos/subir', {
        method: 'POST',
        body: formData,
      })
      setComprobanteUrlInput(res.url)
      setExito('Archivo adjuntado correctamente.')
    } catch (err: any) {
      setError('Error al subir comprobante: ' + err.message)
    } finally {
      setSubiendoComprobante(false)
    }
  }

  const handleCambiarEstado = async (id: number, nuevoEstado: 'EnRuta' | 'Completada' | 'Cancelada', notas?: string, comprobanteUrl?: string) => {
    setError('')
    setExito('')
    try {
      await api(`/api/tareas-logistica/${id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({
          estado: nuevoEstado === 'EnRuta' ? 2 : nuevoEstado === 'Completada' ? 3 : 4,
          notasChofer: notas || null,
          comprobanteUrl: comprobanteUrl || null,
        }),
      })
      setExito(`Estado de la tarea actualizado a "${nuevoEstado}".`)
      await cargarDatos()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleEliminarTarea = (id: number) => {
    setIdTareaAEliminar(id)
  }

  const ejecutarEliminacion = async () => {
    if (!idTareaAEliminar) return
    setError('')
    setExito('')
    const id = idTareaAEliminar
    setIdTareaAEliminar(null)
    try {
      await api(`/api/tareas-logistica/${id}`, { method: 'DELETE' })
      setExito('Tarea eliminada con éxito.')
      await cargarDatos()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Tareas filtradas por fecha y estado
  const normalizarFecha = (f?: string | null) => (f ? f.split('T')[0].trim() : '')
  const tareasDelDia = tareas.filter(t => normalizarFecha(t.fechaProgramada) === normalizarFecha(fechaFiltro))
  const tareasFiltradas = tareasDelDia.filter(t => {
    if (filtroEstado === 'todos') return true
    return t.estado === filtroEstado
  })

  // Métricas Bento del día
  const pendientes = tareasDelDia.filter(t => t.estado === 'Pendiente').length
  const enRuta = tareasDelDia.filter(t => t.estado === 'EnRuta').length
  const completadas = tareasDelDia.filter(t => t.estado === 'Completada').length

  // Lista de choferes únicos presentes en las tareas del día (para la matriz)
  const choferesEnMatriz = choferes.length > 0
    ? choferes
    : Array.from(new Set(tareasDelDia.map(t => t.choferId)))
        .map(id => tareasDelDia.find(t => t.choferId === id)?.chofer)
        .filter((c): c is NonNullable<typeof c> => c !== null && c !== undefined)

  return (
    <>
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-[#001f51] font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-[#3755c3]">local_shipping</span>
            Programación y Matriz Logística (07:00 - 17:00)
          </h1>
          <p className="font-body-md text-body-md text-slate-500 mt-1 max-w-2xl">
            {esChofer
              ? 'Revisa la matriz con tus bloques horarios asignados y marca el progreso de tus despachos.'
              : 'Asigna, edita y elimina rutas por día y hora, y monitorea la matriz horaria de trabajo de tus conductores.'}
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm self-start md:self-auto">
          <button
            onClick={() => setVista('matriz')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${vista === 'matriz' ? 'bg-[#001f51] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined text-base">grid_on</span>
            <span>Matriz Horaria</span>
          </button>
          <button
            onClick={() => setVista('tarjetas')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${vista === 'tarjetas' ? 'bg-[#001f51] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined text-base">view_agenda</span>
            <span>Vista Tarjetas</span>
          </button>
        </div>
      </div>

      {/* Date Navigation Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="material-symbols-outlined text-slate-400 text-xl">calendar_month</span>
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Fecha Seleccionada:</span>
          <input
            type="date"
            value={fechaFiltro}
            onChange={e => setFechaFiltro(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-[#001f51] outline-none focus:border-[#3755c3]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFechaFiltro(sumarDiasLocal(fechaFiltro, -1))}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
            <span>Día Anterior</span>
          </button>

          <button
            onClick={() => setFechaFiltro(todayStr)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${fechaFiltro === todayStr ? 'bg-[#3755c3] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            Hoy
          </button>

          <button
            onClick={() => setFechaFiltro(sumarDiasLocal(fechaFiltro, 1))}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>Día Siguiente</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-[#3755c3] rounded-lg">
            <span className="material-symbols-outlined text-2xl">assignment</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tareas del Día</p>
            <h3 className="text-2xl font-bold text-[#001f51] mt-0.5">{tareasDelDia.length}</h3>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <span className="material-symbols-outlined text-2xl">pending_actions</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendientes</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{pendientes}</h3>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <span className="material-symbols-outlined text-2xl">route</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En Ruta</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{enRuta}</h3>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <span className="material-symbols-outlined text-2xl">check_circle</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completadas</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{completadas}</h3>
          </div>
        </div>
      </section>

      {/* Global Alerts */}
      {error && (
        <div className="text-red-700 text-xs flex items-center gap-1.5 alert bg-red-50 p-3 rounded-lg border border-red-200 mb-6" style={{ color: '#ba1a1a' }}>
          <span className="material-symbols-outlined text-sm shrink-0">error</span>
          <span>{error}</span>
        </div>
      )}

      {exito && (
        <div className="text-green-700 text-xs flex items-center gap-1.5 alert bg-green-50 p-3 rounded-lg border border-green-200 mb-6">
          <span className="material-symbols-outlined text-sm shrink-0">check_circle</span>
          <span>{exito}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Task Creation Form (Admin / Encargado / Almacenero) */}
        {puedeAsignar && (
          <form className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4" onSubmit={handleCrearTarea}>
            <div>
              <h2 className="text-sm font-bold text-[#001f51] uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-[#3755c3]">edit_calendar</span>
                Programar Tarea a Chofer
              </h2>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Asigna fecha, rango horario y chofer responsable</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">TÍTULO / GUÍA DE DESPACHO *</label>
              <input
                type="text"
                required
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ej. Despacho Carga Lote #105"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">CONDUCTOR / CHOFER *</label>
              <select
                required
                value={choferId}
                onChange={e => setChoferId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all cursor-pointer font-semibold text-slate-700"
              >
                <option value="">-- Seleccionar Chofer --</option>
                {choferes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Hours Grid */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">FECHA DE PROGRAMACIÓN *</label>
                <input
                  type="date"
                  required
                  value={fechaProgramada}
                  onChange={e => setFechaProgramada(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#3755c3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">HORA INICIO *</label>
                  <select
                    value={horaInicio}
                    onChange={e => setHoraInicio(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-[#3755c3]"
                  >
                    {HORAS_JORNADA.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">HORA FIN *</label>
                  <select
                    value={horaFin}
                    onChange={e => setHoraFin(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-[#3755c3]"
                  >
                    {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Warehouse Selector */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">ALMACÉN ORIGEN</label>
                <select
                  value={origenId}
                  onChange={e => setOrigenId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3]"
                >
                  <option value="">Sin especificar</option>
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">ALMACÉN DESTINO</label>
                <select
                  value={destinoId}
                  onChange={e => setDestinoId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3]"
                >
                  <option value="">Sin especificar</option>
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">DESCRIPCIÓN / INSTRUCCIONES</label>
              <textarea
                rows={2}
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Detalles de la carga, observaciones..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-2.5 bg-[#001f51] hover:bg-[#00337c] text-white rounded-lg text-xs font-bold shadow transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">calendar_add_on</span>
              <span>Programar Tarea</span>
            </button>
          </form>
        )}

        {/* Content View Section (Matriz vs Tarjetas) */}
        <div className={`${puedeAsignar ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6`}>
          
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xs font-bold text-[#001f51] uppercase tracking-wider">
              {vista === 'matriz' ? 'MATRIZ HORARIA DE TRABAJO (07:00 - 17:00)' : 'HOJA DE RUTA DETALLADA'}
            </h2>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['todos', 'Pendiente', 'EnRuta', 'Completada'].map(st => (
                <button
                  key={st}
                  onClick={() => setFiltroEstado(st)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${filtroEstado === st ? 'bg-[#001f51] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {st === 'todos' ? 'Todas' : st === 'EnRuta' ? 'En Ruta' : st}
                </button>
              ))}
            </div>
          </div>

          {/* VISTA 1: MATRIZ HORARIA (07:00 - 17:00) */}
          {vista === 'matriz' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24 border-r border-slate-200 text-center">
                        HORA
                      </th>
                      {choferesEnMatriz.length > 0 ? (
                        choferesEnMatriz.map(c => {
                          const totalChoferHoy = tareasDelDia.filter(t => t.choferId === c.id).length
                          return (
                            <th key={c.id} className="p-3 text-[11px] font-bold text-[#001f51] uppercase tracking-wider border-r border-slate-200 min-w-[220px]">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-slate-400 text-lg">account_circle</span>
                                  <div>
                                    <div className="font-bold">{c.nombre}</div>
                                    <div className="text-[9px] text-slate-400 lowercase font-normal">{c.email}</div>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 bg-blue-50 text-[#3755c3] border border-blue-100 rounded-full text-[10px] font-extrabold shrink-0">
                                  {totalChoferHoy} {totalChoferHoy === 1 ? 'tarea' : 'tareas'}
                                </span>
                              </div>
                            </th>
                          )
                        })
                      ) : (
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          PROGRAMACIÓN DEL DÍA
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {HORAS_JORNADA.map(hora => {
                      const horaNum = parseInt(hora.split(':')[0], 10)
                      return (
                        <tr key={hora} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          {/* Columna de Hora */}
                          <td className="p-3 text-xs font-bold text-[#3755c3] border-r border-slate-200 text-center bg-slate-50/40">
                            {hora}
                          </td>

                          {/* Columnas por Chofer */}
                          {choferesEnMatriz.length > 0 ? (
                            choferesEnMatriz.map(c => {
                              const tareasEnHora = tareasFiltradas.filter(t => {
                                if (t.choferId !== c.id) return false
                                const hInicio = t.horaInicio || '08:00'
                                const hFin = t.horaFin || '09:00'
                                const inicioH = parseInt(hInicio.split(':')[0], 10)
                                const finH = parseInt(hFin.split(':')[0], 10)
                                if (inicioH === horaNum) return true
                                return inicioH < horaNum && finH > horaNum
                              })

                              return (
                                <td key={c.id} className="p-2 border-r border-slate-200 align-top">
                                  {tareasEnHora.length > 0 ? (
                                    <div className="space-y-2">
                                      {tareasEnHora.map(t => {
                                        const esPendiente = t.estado === 'Pendiente'
                                        const esEnRuta = t.estado === 'EnRuta'
                                        const esCompletada = t.estado === 'Completada'

                                        return (
                                          <div
                                            key={t.id}
                                            className={`p-2.5 rounded-lg border text-xs shadow-2xs transition-all relative group ${esPendiente ? 'bg-amber-50/80 border-amber-200 text-amber-900' : esEnRuta ? 'bg-indigo-50 border-indigo-200 text-indigo-950 animate-pulse' : esCompletada ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-red-50 border-red-200 text-red-900'}`}
                                          >
                                            {/* Action buttons (Edit & Delete for Admin/Encargado/Almacenero) */}
                                            {puedeAsignar && (
                                              <div className="flex items-center gap-1 absolute top-2 right-2">
                                                <button
                                                  type="button"
                                                  onClick={() => abrirModalEditar(t)}
                                                  className="p-1 px-1.5 bg-white/90 hover:bg-[#3755c3] text-slate-500 hover:text-white border border-slate-200 hover:border-[#3755c3] rounded transition-all cursor-pointer shadow-2xs flex items-center justify-center"
                                                  title="Editar Tarea"
                                                >
                                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleEliminarTarea(t.id)}
                                                  className="p-1 px-1.5 bg-white/90 hover:bg-red-600 text-slate-500 hover:text-white border border-slate-200 hover:border-red-600 rounded transition-all cursor-pointer shadow-2xs flex items-center justify-center"
                                                  title="Eliminar Tarea"
                                                >
                                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                                                </button>
                                              </div>
                                            )}

                                            <div className="flex items-center justify-between gap-1 mb-1 pr-12">
                                              <span className="font-bold text-[11px] truncate">{t.titulo}</span>
                                            </div>

                                            <div className="mb-1 text-[10px] font-extrabold text-[#3755c3]">
                                              ⏱️ {t.horaInicio} - {t.horaFin}
                                            </div>

                                            {(t.almacenOrigen || t.almacenDestino) && (
                                              <div className="text-[10px] opacity-80 mb-1.5 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">alt_route</span>
                                                <span className="truncate">{t.almacenOrigen || 'Origen'} ➔ {t.almacenDestino || 'Destino'}</span>
                                              </div>
                                            )}

                                            {t.comprobanteUrl && (
                                              <div className="mt-1.5 pt-1.5 border-t border-slate-200/60">
                                                {/\.(jpg|jpeg|png|webp|gif)$/i.test(t.comprobanteUrl) ? (
                                                  <a href={t.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="block">
                                                    <img src={t.comprobanteUrl} alt="Comprobante" className="w-full h-16 object-cover rounded border border-slate-200 hover:opacity-90" />
                                                  </a>
                                                ) : (
                                                  <a href={t.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-[#3755c3] hover:underline">
                                                    <span className="material-symbols-outlined text-xs">description</span>
                                                    <span>Evidencia Adjunta</span>
                                                  </a>
                                                )}
                                              </div>
                                            )}

                                            {/* Acciones para Chofer */}
                                            {esChofer && esPendiente && (
                                              <button
                                                onClick={() => handleCambiarEstado(t.id, 'EnRuta')}
                                                className="w-full mt-1 py-1 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                                              >
                                                <span className="material-symbols-outlined text-xs">directions_car</span>
                                                <span>Iniciar Ruta</span>
                                              </button>
                                            )}

                                            {esChofer && esEnRuta && (
                                              <button
                                                onClick={() => { setModalTarea(t); setNotasChoferInput(''); }}
                                                className="w-full mt-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                                              >
                                                <span className="material-symbols-outlined text-xs">task_alt</span>
                                                <span>Entregar</span>
                                              </button>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : (
                                    <div className="h-full min-h-[40px] flex items-center justify-center text-[10px] text-slate-300 font-medium italic">
                                      Libre
                                    </div>
                                  )}
                                </td>
                              )
                            })
                          ) : (
                            <td className="p-2 border-r border-slate-200 align-top">
                              {tareasFiltradas.filter(t => t.horaInicio === hora).map(t => (
                                <div key={t.id} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold">
                                  {t.titulo} ({t.horaInicio} - {t.horaFin})
                                </div>
                              ))}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VISTA 2: LISTA DE TARJETAS */}
          {vista === 'tarjetas' && (
            <div className="space-y-4">
              {tareasFiltradas.length > 0 ? (
                tareasFiltradas.map(t => {
                  const esPendiente = t.estado === 'Pendiente'
                  const esEnRuta = t.estado === 'EnRuta'
                  const esCompletada = t.estado === 'Completada'

                  return (
                    <div key={t.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 transition-all hover:shadow-md">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${esPendiente ? 'bg-amber-50 text-amber-700 border border-amber-200' : esEnRuta ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse' : esCompletada ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700'}`}>
                              {t.estado === 'EnRuta' ? '🚚 En Ruta' : t.estado}
                            </span>
                            <span className="text-[11px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                              📅 {t.fechaProgramada} ({t.horaInicio} - {t.horaFin})
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-[#001f51] mt-1">{t.titulo}</h3>
                        </div>

                        {/* Driver & Manager actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {esChofer && esPendiente && (
                            <button
                              onClick={() => handleCambiarEstado(t.id, 'EnRuta')}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-base">directions_car</span>
                              <span>Iniciar Ruta</span>
                            </button>
                          )}

                          {esChofer && esEnRuta && (
                            <button
                              onClick={() => { setModalTarea(t); setNotasChoferInput(''); }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-base">task_alt</span>
                              <span>Marcar Entregada</span>
                            </button>
                          )}

                          {puedeAsignar && (
                            <>
                              <button
                                type="button"
                                onClick={() => abrirModalEditar(t)}
                                className="p-2 bg-white hover:bg-[#3755c3] text-slate-500 hover:text-white border border-slate-200 hover:border-[#3755c3] rounded-lg transition-all cursor-pointer shadow-2xs flex items-center justify-center"
                                title="Editar tarea"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEliminarTarea(t.id)}
                                className="p-2 bg-white hover:bg-red-600 text-slate-500 hover:text-white border border-slate-200 hover:border-red-600 rounded-lg transition-all cursor-pointer shadow-2xs flex items-center justify-center"
                                title="Eliminar tarea"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Details Info */}
                      {t.descripcion && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4 leading-relaxed">
                          {t.descripcion}
                        </p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <div>
                          <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wider">CONDUCTOR</span>
                          <span className="font-semibold text-slate-700">{t.chofer?.nombre || 'Chofer Desconocido'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wider">ORIGEN / DESTINO</span>
                          <span className="font-semibold text-slate-700">
                            {t.almacenOrigen || 'Origen N/A'} ➔ {t.almacenDestino || 'Destino N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wider">COMPLETADO</span>
                          <span className="font-semibold text-slate-700">
                            {t.fechaCompletado ? new Date(t.fechaCompletado).toLocaleString() : '—'}
                          </span>
                        </div>
                      </div>

                      {t.notasChofer && (
                        <div className="mt-3 p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg text-xs text-emerald-900">
                          <strong className="block text-[10px] uppercase tracking-wider text-emerald-700 mb-0.5">NOTA DEL CHOFER AL ENTREGAR:</strong>
                          "{t.notasChofer}"
                        </div>
                      )}

                      {t.comprobanteUrl && (
                        <div className="mt-3 p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs">
                          <strong className="block text-[10px] uppercase tracking-wider text-[#3755c3] mb-1">
                            📎 EVIDENCIA / COMPROBANTE DE ENTREGA:
                          </strong>
                          {/\.(jpg|jpeg|png|webp|gif)$/i.test(t.comprobanteUrl) ? (
                            <a href={t.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-1">
                              <img
                                src={t.comprobanteUrl}
                                alt="Comprobante"
                                className="w-36 h-24 object-cover rounded-lg border border-slate-200 shadow-sm hover:opacity-90 transition-opacity"
                              />
                            </a>
                          ) : (
                            <a
                              href={t.comprobanteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#3755c3] hover:bg-slate-50 transition-colors shadow-2xs mt-1"
                            >
                              <span className="material-symbols-outlined text-base">description</span>
                              <span>Ver Documento Adjunto</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                  <span className="material-symbols-outlined text-slate-300 text-5xl mb-3">event_busy</span>
                  <p className="text-sm font-semibold text-slate-600">No hay tareas programadas para la fecha seleccionada.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* MODAL 1: Confirmar Entrega (Chofer) */}
      {modalTarea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 mx-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-emerald-600 bg-emerald-50 p-2.5 rounded-full text-2xl">task_alt</span>
              <div>
                <h3 className="text-sm font-bold text-[#001f51] uppercase tracking-wider">Confirmar Entrega de Carga</h3>
                <p className="text-[11px] text-slate-400 font-medium">Adjunta foto o documento firmado como evidencia</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-600 mb-4 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
              Vas a marcar como completada la tarea: <strong>{modalTarea.titulo}</strong> ({modalTarea.horaInicio} - {modalTarea.horaFin}).
            </p>

            <form onSubmit={(e) => {
              e.preventDefault()
              handleCambiarEstado(modalTarea.id, 'Completada', notasChoferInput, comprobanteUrlInput)
              setModalTarea(null)
              setNotasChoferInput('')
              setComprobanteUrlInput('')
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-tighter">OBSERVACIONES O NOTA DE RECEPCIÓN (OPCIONAL)</label>
                <textarea
                  rows={2}
                  value={notasChoferInput}
                  onChange={e => setNotasChoferInput(e.target.value)}
                  placeholder="Ej. Recibido por encargado de bodega en conformidad..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all resize-none"
                ></textarea>
              </div>

              {/* Upload Evidence Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-tighter">ADJUNTAR FOTO O DOCUMENTO (COMPROBANTE)</label>
                
                {subiendoComprobante ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center text-xs font-bold text-[#3755c3] animate-pulse flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                    <span>Subiendo archivo...</span>
                  </div>
                ) : comprobanteUrlInput ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {/\.(jpg|jpeg|png|webp|gif)$/i.test(comprobanteUrlInput) ? (
                        <img src={comprobanteUrlInput} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-emerald-300 shrink-0" />
                      ) : (
                        <span className="material-symbols-outlined text-emerald-700 text-2xl shrink-0">description</span>
                      )}
                      <div className="truncate text-xs">
                        <span className="font-bold text-emerald-900 block truncate">Archivo Adjuntado</span>
                        <span className="text-[10px] text-emerald-700 truncate block">{comprobanteUrlInput.split('/').pop()}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setComprobanteUrlInput('')}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                      title="Quitar comprobante"
                    >
                      <span className="material-symbols-outlined text-lg">cancel</span>
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-[#3755c3] bg-slate-50 hover:bg-blue-50/50 rounded-xl transition-all cursor-pointer group">
                    <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-[#3755c3] mb-1">add_a_photo</span>
                    <span className="text-xs font-bold text-slate-600 group-hover:text-[#3755c3]">Haz clic para subir Foto o Documento (PDF/Doc)</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Formatos aceptados: JPG, PNG, WEBP, PDF</span>
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleSubirComprobante}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalTarea(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-colors cursor-pointer !bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={subiendoComprobante}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>Confirmar Entrega</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Editar Tarea (Admin / Encargado / Almacenero) */}
      {tareaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#3755c3] bg-blue-50 p-2 rounded-lg">edit</span>
                <h3 className="text-sm font-bold text-[#001f51] uppercase tracking-wider">Editar Tarea de Logística</h3>
              </div>
              <button
                onClick={() => setTareaEditando(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">TÍTULO / GUÍA DE DESPACHO *</label>
                <input
                  type="text"
                  required
                  value={editTitulo}
                  onChange={e => setEditTitulo(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">CONDUCTOR / CHOFER *</label>
                <select
                  required
                  value={editChoferId}
                  onChange={e => setEditChoferId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all cursor-pointer font-semibold text-slate-700"
                >
                  {choferes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Hours Grid */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">FECHA DE PROGRAMACIÓN *</label>
                  <input
                    type="date"
                    required
                    value={editFechaProgramada}
                    onChange={e => setEditFechaProgramada(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#3755c3]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">HORA INICIO *</label>
                    <select
                      value={editHoraInicio}
                      onChange={e => setEditHoraInicio(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-[#3755c3]"
                    >
                      {HORAS_JORNADA.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">HORA FIN *</label>
                    <select
                      value={editHoraFin}
                      onChange={e => setEditHoraFin(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-[#3755c3]"
                    >
                      {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Warehouse Selector */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">ALMACÉN ORIGEN</label>
                  <select
                    value={editOrigenId}
                    onChange={e => setEditOrigenId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3]"
                  >
                    <option value="">Sin especificar</option>
                    {almacenes.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">ALMACÉN DESTINO</label>
                  <select
                    value={editDestinoId}
                    onChange={e => setEditDestinoId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3]"
                  >
                    <option value="">Sin especificar</option>
                    {almacenes.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">DESCRIPCIÓN / INSTRUCCIONES</label>
                <textarea
                  rows={2}
                  value={editDescripcion}
                  onChange={e => setEditDescripcion(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTareaEditando(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-colors cursor-pointer !bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-4 py-2 bg-[#001f51] hover:bg-[#00337c] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">save</span>
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Confirmación de Eliminación Premium */}
      {idTareaAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 mx-4 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>

            <div>
              <h3 className="text-base font-bold text-[#001f51]">¿Eliminar Tarea?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Esta acción no se puede deshacer. La tarea será removida permanentemente de la hoja de ruta.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIdTareaAEliminar(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer !bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={ejecutarEliminacion}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
