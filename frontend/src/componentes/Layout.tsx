import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const enlaces = [
  { a: '/', texto: 'Existencias' },
  { a: '/productos', texto: 'Productos' },
  { a: '/almacenes', texto: 'Almacenes' },
  { a: '/movimientos', texto: 'Movimientos' },
  { a: '/logistica-choferes', texto: 'Logística Choferes' },
  { a: '/reportes', texto: 'Reportes' },
]

export default function Layout() {
  const { sesion, logout } = useAuth()

  return (
    <div className="bg-[#f4f7fc] text-on-surface font-body-md overflow-x-hidden min-h-screen flex flex-col justify-between">
      <div>
        {/* Navigation Shell */}
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 flex justify-between items-center w-full px-margin-desktop h-16">
          <div className="flex items-center gap-stack-md h-full">
            <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight mr-8">OVOPLUS</span>
            <div className="hidden md:flex items-center gap-6 h-full">
              {enlaces.map(e => (
                <NavLink
                  key={e.a}
                  to={e.a}
                  end={e.a === '/'}
                  className={({ isActive }) =>
                    isActive
                      ? 'text-primary font-bold border-b-2 border-primary h-full flex items-center px-1 transition-all'
                      : 'text-on-surface-variant hover:text-primary h-full flex items-center px-1 transition-all'
                  }
                >
                  {e.texto}
                </NavLink>
              ))}
              {sesion?.rol === 'Admin' && (
                <NavLink
                  to="/usuarios"
                  className={({ isActive }) =>
                    isActive
                      ? 'text-primary font-bold border-b-2 border-primary h-full flex items-center px-1 transition-all'
                      : 'text-on-surface-variant hover:text-primary h-full flex items-center px-1 transition-all'
                  }
                >
                  Usuarios
                </NavLink>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="!bg-transparent hover:!bg-slate-100 !p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center"
              title="Notificaciones"
            >
              <span className="material-symbols-outlined !text-slate-500 text-xl block">notifications</span>
            </button>
            <button
              className="!bg-transparent hover:!bg-slate-100 !p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center"
              title="Ajustes"
            >
              <span className="material-symbols-outlined !text-slate-500 text-xl block">settings</span>
            </button>
            <button
              className="!bg-transparent hover:!bg-slate-100 !p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center"
              title="Cerrar Sesión"
              onClick={logout}
            >
              <span className="material-symbols-outlined !text-slate-500 text-xl block">logout</span>
            </button>
            <div
              className="w-8 h-8 rounded-full border border-slate-200 overflow-hidden shadow-sm shrink-0"
              title={sesion?.nombre || 'Usuario'}
            >
              <img
                alt="Avatar del usuario"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKV6VuYU3qOWGt_8xocANHfQQfeJSaQvmv2Uw3pjpvmgDa_Ik_OLeRxTqH66kP1BmUVo1zM6oGF-uYX72g9LEoqwNQuBjFXs0DyNkn3TtpvuRiRlKc6k3CzWets1jwWvX0UR6jo8TtClsNRJA8Px43cxv8Bcac32HFgJR3-wPEZYftIuEPOiBCMmq1DtsUpSZJCohkn8nzRPjXO8RH7Kj3f4a38Zu4ElWmCMqw14eCPiu-WmhlZE8lYebzeHz0Nppih9IP15Qo4MM"
              />
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="relative z-10 px-margin-mobile md:px-margin-desktop py-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Footer Shell */}
      <footer className="w-full py-6 px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-stack-md bg-white border-t border-slate-200 mt-stack-lg">
        <div className="flex flex-col gap-base">
          <span className="font-label-sm text-label-sm font-bold text-on-surface-variant">OVOPLUS LOGISTICS</span>
          <p className="font-label-md text-label-md text-secondary">© 2026 OVOPLUS Logistics Systems. All rights reserved.</p>
        </div>
        <div className="flex gap-6">
          <a className="text-slate-500 font-label-md text-label-md hover:text-primary transition-colors cursor-pointer" href="#">Support</a>
          <a className="text-slate-500 font-label-md text-label-md hover:text-primary transition-colors cursor-pointer" href="#">Privacy Policy</a>
          <a className="text-slate-500 font-label-md text-label-md hover:text-primary transition-colors cursor-pointer" href="#">Terms of Service</a>
        </div>
      </footer>
    </div>
  )
}
