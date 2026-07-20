import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/cliente'
import type { Almacen, TareaLogistica, UsuarioLista } from '../api/tipos'
import { useAuth } from '../auth/AuthContext'

export default function LogisticaChoferes() {
  const { sesion } = useAuth()
  const esChofer = sesion?.rol === 'Chofer'
  const puedeAsignar = sesion?.rol === 'Admin' || sesion?.rol === 'Encargado' || sesion?.rol === 'Almacenero'

  const [tareas, setTareas] = useState<TareaLogistica[]>([])
  const [choferes, setChoferes] = useState<UsuarioLista[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  
  // Form estado para nueva tarea
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [choferId, setChoferId] = useState('')
  const [origenId, setOrigenId] = useState('')
  const [destinoId, setDestinoId] = useState('')

  // Modal para completar tarea
  const [modalTarea, setModalTarea] = useState<TareaLogistica | null>(null)
  const [notasChoferInput, setNotasChoferInput] = useState('')

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
        }),
      })
      setExito('Tarea asignada al chofer con éxito.')
      setTitulo('')
      setDescripcion('')
      setChoferId('')
      setOrigenId('')
      setDestinoId('')
      await cargarDatos()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  const handleCambiarEstado = async (id: number, nuevoEstado: 'EnRuta' | 'Completada' | 'Cancelada', notas?: string) => {
    setError('')
    setExito('')
    try {
      await api(`/api/tareas-logistica/${id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({
          estado: nuevoEstado === 'EnRuta' ? 2 : nuevoEstado === 'Completada' ? 3 : 4,
          notasChofer: notas || null,
        }),
      })
      setExito(`Estado de la tarea actualizado a "${nuevoEstado}".`)
      await cargarDatos()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleEliminarTarea = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta tarea de logística?')) return
    setError('')
    setExito('')
    try {
      await api(`/api/tareas-logistica/${id}`, { method: 'DELETE' })
      setExito('Tarea eliminada.')
      await cargarDatos()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Filtrado de tareas
  const tareasFiltradas = tareas.filter(t => {
    if (filtroEstado === 'todos') return true
    return t.estado === filtroEstado
  })

  // Métricas Bento
  const pendientes = tareas.filter(t => t.estado === 'Pendiente').length
  const enRuta = tareas.filter(t => t.estado === 'EnRuta').length
  const completadas = tareas.filter(t => t.estado === 'Completada').length

  return (
    <>
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-[#001f51] font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-[#3755c3]">local_shipping</span>
            Logística & Hojas de Ruta
          </h1>
          <p className="font-body-md text-body-md text-slate-500 mt-1 max-w-2xl">
            {esChofer
              ? 'Consulta tus tareas asignadas, inicia rutas y marca tus entregas de insumos.'
              : 'Asigna despachos a los conductores y supervisa las rutas en tiempo real.'}
          </p>
        </div>
      </div>

      {/* Bento Grid Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-[#3755c3] rounded-lg">
            <span className="material-symbols-outlined text-2xl">assignment</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tareas</p>
            <h3 className="text-2xl font-bold text-[#001f51] mt-0.5">{tareas.length}</h3>
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

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Form panel for Admins / Managers */}
        {puedeAsignar && (
          <form className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5" onSubmit={handleCrearTarea}>
            <div>
              <h2 className="text-sm font-bold text-[#001f51] uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-[#3755c3]">add_task</span>
                Asignar Tarea a Chofer
              </h2>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Crea un nuevo despacho o ruta para el conductor</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">TÍTULO / GUÍA DE DESPACHO *</label>
              <input
                type="text"
                required
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ej. Entrega Carga Lote #104"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">CONDUCTOR / CHOFER *</label>
              <select
                required
                value={choferId}
                onChange={e => setChoferId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all cursor-pointer font-semibold text-slate-700"
              >
                <option value="">-- Seleccionar Chofer --</option>
                {choferes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.email})
                  </option>
                ))}
              </select>
              {choferes.length === 0 && (
                <p className="text-[10px] text-amber-600 mt-1 font-medium">
                  * No hay usuarios con rol "Chofer" activos. Ve a Usuarios para registrar uno.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-tighter">ALMACÉN ORIGEN</label>
                <select
                  value={origenId}
                  onChange={e => setOrigenId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all cursor-pointer"
                >
                  <option value="">Sin especificar</option>
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-tighter">ALMACÉN DESTINO</label>
                <select
                  value={destinoId}
                  onChange={e => setDestinoId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all cursor-pointer"
                >
                  <option value="">Sin especificar</option>
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">DESCRIPCIÓN / INSTRUCCIONES</label>
              <textarea
                rows={3}
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Dirección de entrega, observaciones de la carga, contacto..."
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3 bg-[#001f51] hover:bg-[#00337c] text-white rounded-lg text-xs font-bold shadow transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">send</span>
              <span>Asignar Tarea a Chofer</span>
            </button>
          </form>
        )}

        {/* Tasks List Feed */}
        <div className={`${puedeAsignar ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6`}>
          
          {/* Tabs Filter Header */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xs font-bold text-[#001f51] uppercase tracking-wider">
              {esChofer ? 'MIS RUTAS Y ASIGNACIONES' : 'TODAS LAS TAREAS DE LOGÍSTICA'}
            </h2>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['todos', 'Pendiente', 'EnRuta', 'Completada'].map(st => (
                <button
                  key={st}
                  onClick={() => setFiltroEstado(st)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${filtroEstado === st ? 'bg-[#001f51] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {st === 'todos' ? 'Todas' : st === 'EnRuta' ? 'En Ruta' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Cards List */}
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
                          <span className="text-[11px] text-slate-400 font-medium">
                            Asignada: {new Date(t.fechaAsignacion).toLocaleString()}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[#001f51]">{t.titulo}</h3>
                      </div>

                      {/* Driver actions */}
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
                          <button
                            onClick={() => handleEliminarTarea(t.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar tarea"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
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
                  </div>
                )
              })
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                <span className="material-symbols-outlined text-slate-300 text-5xl mb-3">no_crash</span>
                <p className="text-sm font-semibold text-slate-600">No hay tareas registradas en esta vista.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para que el Chofer ingrese nota al completar */}
      {modalTarea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 mx-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-emerald-600 bg-emerald-50 p-2 rounded-full">task_alt</span>
              <h3 className="text-sm font-bold text-[#001f51] uppercase tracking-wider">Confirmar Entrega de Carga</h3>
            </div>
            
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Vas a marcar como completada la tarea: <strong>{modalTarea.titulo}</strong>.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault()
              handleCambiarEstado(modalTarea.id, 'Completada', notasChoferInput)
              setModalTarea(null)
            }}>
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">OBSERVACIONES O NOTA DE RECEPCIÓN (OPCIONAL)</label>
                <textarea
                  rows={3}
                  value={notasChoferInput}
                  onChange={e => setNotasChoferInput(e.target.value)}
                  placeholder="Ej. Recibido por encargado de bodega en conformidad..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalTarea(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-colors cursor-pointer !bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Confirmar Entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
