import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/cliente'
import type { ResumenNotificaciones } from '../api/tipos'

const TODOS_MODULOS_DEFAULT = ['dashboard', 'productos', 'almacenes', 'movimientos', 'logistica', 'reportes', 'usuarios']

interface EnlaceNav {
  a: string
  texto: string
  icono: string
  moduloId: string
}

const enlaces: EnlaceNav[] = [
  { a: '/', texto: 'Existencias', icono: 'grid_view', moduloId: 'productos' },
  { a: '/recepcion-materia-prima', texto: 'Recepción MP', icono: 'move_to_inbox', moduloId: 'movimientos' },
  { a: '/productos', texto: 'Productos', icono: 'inventory_2', moduloId: 'productos' },
  { a: '/almacenes', texto: 'Almacenes', icono: 'warehouse', moduloId: 'almacenes' },
  { a: '/movimientos', texto: 'Movimientos', icono: 'swap_horiz', moduloId: 'movimientos' },
  { a: '/logistica-choferes', texto: 'Logística Choferes', icono: 'local_shipping', moduloId: 'logistica' },
  { a: '/reportes', texto: 'Reportes', icono: 'analytics', moduloId: 'reportes' },
  { a: '/usuarios', texto: 'Usuarios', icono: 'group', moduloId: 'usuarios' },
  { a: '/dashboard', texto: 'Dashboard', icono: 'dashboard', moduloId: 'dashboard' },
]

export default function Layout() {
  const { sesion, logout } = useAuth()
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false)
  const [panelNotifAbierto, setPanelNotifAbierto] = useState(false)
  const [tabNotif, setTabNotif] = useState<'stock' | 'vencimiento' | 'tareas'>('stock')
  const [notif, setNotif] = useState<ResumenNotificaciones | null>(null)
  
  // Notificaciones leídas localmente
  const [leidasTimestamp, setLeidasTimestamp] = useState<number>(() => {
    const saved = localStorage.getItem('ovoplus_notif_leidas_ts')
    return saved ? Number(saved) : 0
  })

  useEffect(() => {
    const cargarNotificaciones = () => {
      api<ResumenNotificaciones>('/api/notificaciones/resumen')
        .then(data => setNotif(data))
        .catch(() => {})
    }
    cargarNotificaciones()
    const interval = setInterval(cargarNotificaciones, 30000)
    return () => clearInterval(interval)
  }, [])

  const marcarComoLeidas = () => {
    const now = Date.now()
    setLeidasTimestamp(now)
    localStorage.setItem('ovoplus_notif_leidas_ts', now.toString())
  }

  const estaLeido = leidasTimestamp > 0
  const totalAlertasMostrar = estaLeido ? 0 : (notif?.totalAlertas ?? 0)

  // Obtener la lista de módulos permitidos del usuario
  const modulosUsuario = sesion?.modulosPermitidos
    ? sesion.modulosPermitidos.split(',')
    : (sesion?.rol === 'Admin' ? TODOS_MODULOS_DEFAULT : TODOS_MODULOS_DEFAULT)

  // Filtrar enlaces de acuerdo a los módulos permitidos
  const enlacesVisibles = enlaces.filter(e => {
    if (e.moduloId === 'dashboard') return true
    if (e.moduloId === 'usuarios') {
      return sesion?.rol === 'Admin' || modulosUsuario.includes('usuarios')
    }
    return modulosUsuario.includes(e.moduloId)
  })

  return (
    <div className="bg-[#f4f7fc] text-on-surface font-body-md overflow-x-hidden min-h-screen flex flex-col justify-between">
      <div>
        {/* Navigation Shell Desktop & Mobile Header */}
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 w-full px-4 md:px-margin-desktop h-16 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3 md:gap-8 h-full">
            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMenuMovilAbierto(true)}
              className="md:hidden p-2 text-slate-600 hover:text-[#001f51] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer !bg-transparent"
              title="Abrir menú"
            >
              <span className="material-symbols-outlined text-2xl block">menu</span>
            </button>

            <NavLink to="/" className="font-headline-md text-headline-md font-bold text-[#001f51] tracking-tight flex items-center gap-2">
              <span className="bg-[#3755c3] text-white p-1 rounded-md text-xs font-black">OP</span>
              <span>OVOPLUS</span>
            </NavLink>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-5 h-full">
              {enlacesVisibles.map(e => (
                <NavLink
                  key={e.a}
                  to={e.a}
                  end={e.a === '/'}
                  className={({ isActive }) =>
                    isActive
                      ? 'text-[#3755c3] font-bold border-b-2 border-[#3755c3] h-full flex items-center px-1 text-xs transition-all'
                      : 'text-slate-600 hover:text-[#3755c3] h-full flex items-center px-1 text-xs transition-all font-medium'
                  }
                >
                  {e.texto}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Right Action Icons & Profile Badge */}
          <div className="flex items-center gap-2 md:gap-3 relative">
            <button
              onClick={() => setPanelNotifAbierto(!panelNotifAbierto)}
              className="!bg-transparent hover:!bg-slate-100 p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center text-slate-500 relative"
              title="Notificaciones"
            >
              <span className="material-symbols-outlined text-xl block">notifications</span>
              {totalAlertasMostrar > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border-2 border-white animate-pulse">
                  {totalAlertasMostrar}
                </span>
              )}
            </button>

            {/* Panel de Notificaciones Dropdown */}
            {panelNotifAbierto && (
              <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-lg">notifications_active</span>
                    <span className="font-bold text-xs uppercase tracking-wider">
                      Alertas del Sistema ({notif?.totalAlertas ?? 0})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {notif && notif.totalAlertas > 0 && (
                      <button
                        onClick={marcarComoLeidas}
                        className="text-[11px] font-semibold text-blue-300 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition-all cursor-pointer"
                        title="Marcar todas como leídas"
                      >
                        <span className="material-symbols-outlined text-sm">done_all</span>
                        <span>Marcar leídas</span>
                      </button>
                    )}
                    <button
                      onClick={() => setPanelNotifAbierto(false)}
                      className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer !bg-transparent"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                </div>

                {/* Banner de leídas */}
                {estaLeido && (
                  <div className="bg-emerald-50 text-emerald-800 px-3 py-2 text-[11px] font-medium flex items-center justify-between border-b border-emerald-100">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                      <span>Notificaciones marcadas como leídas</span>
                    </div>
                    <button
                      onClick={() => {
                        setLeidasTimestamp(0)
                        localStorage.removeItem('ovoplus_notif_leidas_ts')
                      }}
                      className="text-[10px] text-emerald-700 font-bold underline hover:text-emerald-900 cursor-pointer"
                    >
                      Deshacer
                    </button>
                  </div>
                )}

                {/* Notification Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600">
                  <button
                    onClick={() => setTabNotif('stock')}
                    className={`flex-1 py-2 px-1 text-center transition-colors cursor-pointer ${tabNotif === 'stock' ? 'bg-white text-[#3755c3] border-b-2 border-[#3755c3]' : 'hover:bg-slate-100'}`}
                  >
                    Stock ({notif?.alertasStock.length ?? 0})
                  </button>
                  <button
                    onClick={() => setTabNotif('vencimiento')}
                    className={`flex-1 py-2 px-1 text-center transition-colors cursor-pointer ${tabNotif === 'vencimiento' ? 'bg-white text-amber-600 border-b-2 border-amber-600' : 'hover:bg-slate-100'}`}
                  >
                    Vencimientos ({notif?.alertasVencimiento.length ?? 0})
                  </button>
                  <button
                    onClick={() => setTabNotif('tareas')}
                    className={`flex-1 py-2 px-1 text-center transition-colors cursor-pointer ${tabNotif === 'tareas' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'hover:bg-slate-100'}`}
                  >
                    Choferes ({notif?.tareasPendientes ?? 0})
                  </button>
                </div>

                {/* Tab Content List */}
                <div className={`max-h-80 overflow-y-auto divide-y divide-slate-100 p-2 ${estaLeido ? 'opacity-60' : ''}`}>
                  {tabNotif === 'stock' && (
                    notif?.alertasStock && notif.alertasStock.length > 0 ? (
                      notif.alertasStock.map((a, i) => (
                        <div key={i} className="p-2.5 hover:bg-slate-50 rounded-lg transition-colors flex items-start gap-2.5">
                          <span className="material-symbols-outlined text-red-500 text-lg shrink-0 mt-0.5">warning</span>
                          <div className="text-xs">
                            <div className="font-bold text-slate-800">{a.productoNombre} <span className="text-slate-400 font-normal">({a.sku})</span></div>
                            <div className="text-[11px] text-slate-500">{a.almacenNombre}</div>
                            <div className="text-[11px] font-semibold text-red-600 mt-1">
                              Stock: {a.stockActual} / Mínimo: {a.stockMinimo} {a.unidadMedida}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400">
                        <span className="material-symbols-outlined text-2xl text-emerald-500 block mb-1">check_circle</span>
                        No hay insumos bajo stock mínimo.
                      </div>
                    )
                  )}

                  {tabNotif === 'vencimiento' && (
                    notif?.alertasVencimiento && notif.alertasVencimiento.length > 0 ? (
                      notif.alertasVencimiento.map((v, i) => (
                        <div key={i} className={`p-2.5 rounded-lg transition-colors flex items-start gap-2.5 ${v.esVencido ? 'bg-red-50/70 border border-red-100' : 'hover:bg-slate-50'}`}>
                          <span className={`material-symbols-outlined text-lg shrink-0 mt-0.5 ${v.esVencido ? 'text-red-600 font-bold' : 'text-amber-500'}`}>
                            {v.esVencido ? 'event_busy' : 'history_toggle_off'}
                          </span>
                          <div className="text-xs">
                            <div className="font-bold text-slate-800">{v.productoNombre}</div>
                            <div className="text-[11px] text-slate-500">Lote: <strong className="text-slate-700">{v.codigoLote}</strong> ({v.almacenNombre})</div>
                            <div className={`text-[11px] font-bold mt-1 ${v.esVencido ? 'text-red-700' : 'text-amber-700'}`}>
                              {v.esVencido ? `¡VENCIDO! (${v.fechaVencimiento})` : `Vence el ${v.fechaVencimiento} (${v.diasParaVencer} días)`}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400">
                        <span className="material-symbols-outlined text-2xl text-emerald-500 block mb-1">verified</span>
                        No hay lotes próximos a vencer.
                      </div>
                    )
                  )}

                  {tabNotif === 'tareas' && (
                    notif && notif.tareasPendientes > 0 ? (
                      <div className="p-4 text-center">
                        <span className="material-symbols-outlined text-3xl text-blue-600 block mb-1">local_shipping</span>
                        <div className="text-xs font-bold text-slate-700 mb-2">Hay {notif.tareasPendientes} tareas pendientes de chofer</div>
                        <NavLink
                          to="/logistica-choferes"
                          onClick={() => setPanelNotifAbierto(false)}
                          className="inline-block px-3 py-1.5 bg-[#3755c3] text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                        >
                          Ir a Matriz Logística ➔
                        </NavLink>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400">
                        <span className="material-symbols-outlined text-2xl text-emerald-500 block mb-1">task_alt</span>
                        Todas las tareas están al día.
                      </div>
                    )
                  )}
                </div>

                {/* Footer Action */}
                {notif && notif.totalAlertas > 0 && !estaLeido && (
                  <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
                    <button
                      onClick={marcarComoLeidas}
                      className="w-full py-1.5 bg-white hover:bg-slate-100 text-[#001f51] border border-slate-200 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-base text-blue-600">done_all</span>
                      <span>Marcar todas como leídas</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              className="!bg-transparent hover:!bg-slate-100 p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center text-slate-500"
              title="Cerrar Sesión"
              onClick={logout}
            >
              <span className="material-symbols-outlined text-xl block">logout</span>
            </button>

            {/* Profile Badge (Foto 2 style: Username + Initial Circle Avatar) */}
            <div
              className="flex items-center gap-2 pl-1 cursor-default"
              title={`${sesion?.nombre || 'Usuario'} (${sesion?.rol || ''})`}
            >
              <span className="text-xs font-semibold text-slate-700 hidden sm:inline-block">
                {sesion?.nombre || 'Usuario'}
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#3755c3] font-bold text-sm flex items-center justify-center border border-blue-200 shrink-0 shadow-2xs">
                {(sesion?.nombre?.[0] || 'U').toUpperCase()}
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Slide Drawer (Menú Hamburguesa) */}
        {menuMovilAbierto && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop Overlay */}
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
              onClick={() => setMenuMovilAbierto(false)}
            />

            {/* Drawer Content */}
            <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between z-10 p-5 overflow-y-auto">
              <div>
                {/* Header Drawer */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#3755c3] text-white p-1 rounded-md text-xs font-black">OP</span>
                    <span className="font-bold text-[#001f51] tracking-tight text-base">OVOPLUS</span>
                  </div>
                  <button
                    onClick={() => setMenuMovilAbierto(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl block">close</span>
                  </button>
                </div>

                {/* Profile Card in Drawer */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-[#3755c3] font-black text-sm flex items-center justify-center border border-blue-200 shrink-0">
                    {(sesion?.nombre?.[0] || 'U').toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <span className="font-bold text-xs text-[#001f51] block truncate">{sesion?.nombre || 'Usuario'}</span>
                    <span className="text-[10px] font-bold text-[#3755c3] uppercase tracking-wider block">{sesion?.rol || 'Rol'}</span>
                  </div>
                </div>

                {/* Navigation Links List */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 block mb-2">
                    MÓDULOS DE NAVEGACIÓN
                  </span>
                  {enlacesVisibles.map(e => (
                    <NavLink
                      key={e.a}
                      to={e.a}
                      end={e.a === '/'}
                      onClick={() => setMenuMovilAbierto(false)}
                      className={({ isActive }) =>
                        isActive
                          ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 text-[#3755c3] font-bold text-xs transition-all'
                          : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 font-medium text-xs transition-all'
                      }
                    >
                      <span className="material-symbols-outlined text-lg">{e.icono}</span>
                      <span>{e.texto}</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="pt-4 border-t border-slate-100 mt-6">
                <button
                  onClick={() => {
                    setMenuMovilAbierto(false)
                    logout()
                  }}
                  className="w-full py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="relative z-10 px-4 md:px-margin-desktop py-6 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Footer Shell */}
      <footer className="w-full py-6 px-4 md:px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-4 bg-white border-t border-slate-200 mt-8">
        <div className="flex flex-col gap-1 text-center md:text-left">
          <span className="font-label-sm text-label-sm font-bold text-slate-700">OVOPLUS LOGISTICS</span>
          <p className="font-label-md text-xs text-slate-400">© 2026 OVOPLUS Logistics Systems. All rights reserved.</p>
        </div>
        <div className="flex gap-6 text-xs">
          <a className="text-slate-500 hover:text-[#3755c3] transition-colors cursor-pointer" href="#">Soporte</a>
          <a className="text-slate-500 hover:text-[#3755c3] transition-colors cursor-pointer" href="#">Privacidad</a>
          <a className="text-slate-500 hover:text-[#3755c3] transition-colors cursor-pointer" href="#">Términos</a>
        </div>
      </footer>
    </div>
  )
}
