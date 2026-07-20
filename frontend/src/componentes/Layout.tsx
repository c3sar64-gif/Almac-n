import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const TODOS_MODULOS_DEFAULT = ['productos', 'almacenes', 'movimientos', 'logistica', 'reportes', 'usuarios']

interface EnlaceNav {
  a: string
  texto: string
  icono: string
  moduloId: string
}

const enlaces: EnlaceNav[] = [
  { a: '/', texto: 'Existencias', icono: 'grid_view', moduloId: 'productos' },
  { a: '/productos', texto: 'Productos', icono: 'inventory_2', moduloId: 'productos' },
  { a: '/almacenes', texto: 'Almacenes', icono: 'warehouse', moduloId: 'almacenes' },
  { a: '/movimientos', texto: 'Movimientos', icono: 'swap_horiz', moduloId: 'movimientos' },
  { a: '/logistica-choferes', texto: 'Logística Choferes', icono: 'local_shipping', moduloId: 'logistica' },
  { a: '/reportes', texto: 'Reportes', icono: 'analytics', moduloId: 'reportes' },
  { a: '/usuarios', texto: 'Usuarios', icono: 'group', moduloId: 'usuarios' },
]

export default function Layout() {
  const { sesion, logout } = useAuth()
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false)

  // Obtener la lista de módulos permitidos del usuario
  const modulosUsuario = sesion?.modulosPermitidos
    ? sesion.modulosPermitidos.split(',')
    : (sesion?.rol === 'Admin' ? TODOS_MODULOS_DEFAULT : TODOS_MODULOS_DEFAULT)

  // Filtrar enlaces de acuerdo a los módulos permitidos
  const enlacesVisibles = enlaces.filter(e => {
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
          <div className="flex items-center gap-2 md:gap-3">
            <button
              className="!bg-transparent hover:!bg-slate-100 p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center text-slate-500"
              title="Notificaciones"
            >
              <span className="material-symbols-outlined text-xl block">notifications</span>
            </button>
            <button
              className="!bg-transparent hover:!bg-slate-100 p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center text-slate-500"
              title="Cerrar Sesión"
              onClick={logout}
            >
              <span className="material-symbols-outlined text-xl block">logout</span>
            </button>
            <div
              className="w-8 h-8 rounded-full border border-slate-200 overflow-hidden shadow-2xs shrink-0 bg-blue-50 flex items-center justify-center"
              title={`${sesion?.nombre || 'Usuario'} (${sesion?.rol || ''})`}
            >
              <span className="material-symbols-outlined text-base text-[#3755c3]">person</span>
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
                  <div className="w-10 h-10 rounded-full bg-[#3755c3]/10 border border-[#3755c3]/20 flex items-center justify-center text-[#3755c3]">
                    <span className="material-symbols-outlined text-xl">person</span>
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
