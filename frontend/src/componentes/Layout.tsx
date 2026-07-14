import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const enlaces = [
  { a: '/', texto: 'Existencias' },
  { a: '/productos', texto: 'Productos' },
  { a: '/almacenes', texto: 'Almacenes' },
  { a: '/movimientos', texto: 'Movimientos' },
  { a: '/reportes', texto: 'Reportes' },
]

export default function Layout() {
  const { sesion, logout } = useAuth()
  return (
    <>
      <nav>
        {enlaces.map(e => (
          <NavLink key={e.a} to={e.a} end={e.a === '/'}
            className={({ isActive }) => (isActive ? 'activo' : '')}>
            {e.texto}
          </NavLink>
        ))}
        {sesion?.rol === 'Admin' && (
          <NavLink to="/usuarios" className={({ isActive }) => (isActive ? 'activo' : '')}>
            Usuarios
          </NavLink>
        )}
        <span style={{ marginLeft: 'auto', color: '#cfd8e3' }}>
          {sesion?.nombre}{' '}
          <button className="secundario" onClick={logout}>Salir</button>
        </span>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  )
}
