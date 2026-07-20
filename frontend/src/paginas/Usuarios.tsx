import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/cliente'
import type { UsuarioLista } from '../api/tipos'
import { useAuth } from '../auth/AuthContext'

const MODULOS_DISPONIBLES = [
  { id: 'productos', nombre: 'Productos & Catálogo', icono: 'inventory_2', desc: 'Acceso a lista y registro de productos' },
  { id: 'almacenes', nombre: 'Almacenes & Stock', icono: 'warehouse', desc: 'Gestión de bodegas y existencias' },
  { id: 'movimientos', nombre: 'Movimientos & Transferencias', icono: 'swap_horiz', desc: 'Kardex de entradas, salidas y traspasos' },
  { id: 'logistica', nombre: 'Logística Choferes & Hoja Ruta', icono: 'local_shipping', desc: 'Asignación y ejecución de entregas' },
  { id: 'reportes', nombre: 'Reportes & Auditoría', icono: 'analytics', desc: 'Estadísticas e historial de actividades' },
  { id: 'usuarios', nombre: 'Gestión de Usuarios & Permisos', icono: 'group', desc: 'Administración de cuentas y seguridad' },
]

const TODOS_MODULOS = MODULOS_DISPONIBLES.map(m => m.id)
const vacio = { email: '', nombre: '', password: '', rol: 'Almacenero' }

export default function Usuarios() {
  const navigate = useNavigate()
  const { sesion } = useAuth()
  const esAdmin = sesion?.rol === 'Admin'
  const [usuarios, setUsuarios] = useState<UsuarioLista[]>([])
  const [form, setForm] = useState(vacio)
  const [modulosSeleccionados, setModulosSeleccionados] = useState<string[]>(TODOS_MODULOS)
  const [editando, setEditando] = useState<number | null>(null)
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<UsuarioLista | null>(null)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [cargando, setCargando] = useState(false)
  const [verPassword, setVerPassword] = useState(false)
  const [pagina, setPagina] = useState(1)

  const ITEMS_POR_PAGINA = 5

  async function cargar() {
    setUsuarios(await api<UsuarioLista[]>('/api/usuarios'))
  }

  useEffect(() => {
    if (esAdmin) cargar().catch(e => setError(e.message))
  }, [esAdmin])

  const toggleModulo = (id: string) => {
    setModulosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setExito('')
    setCargando(true)
    try {
      const payload = {
        ...form,
        modulosPermitidos: modulosSeleccionados.join(','),
      }
      if (editando === null) {
        if (!form.password) {
          setError('La contraseña es obligatoria para nuevos usuarios.')
          setCargando(false)
          return
        }
        await api('/api/usuarios', { method: 'POST', body: JSON.stringify(payload) })
        setExito('Usuario creado con éxito.')
      } else {
        await api(`/api/usuarios/${editando}`, {
          method: 'PUT',
          body: JSON.stringify({
            email: form.email,
            nombre: form.nombre,
            rol: form.rol,
            password: form.password || null,
            modulosPermitidos: modulosSeleccionados.join(','),
          }),
        })
        setExito('Usuario actualizado con éxito.')
      }
      setForm(vacio)
      setModulosSeleccionados(TODOS_MODULOS)
      setEditando(null)
      await cargar()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  async function cambiarActivo(u: UsuarioLista) {
    setError('')
    setExito('')
    try {
      await api(`/api/usuarios/${u.id}/activo`, {
        method: 'PUT',
        body: JSON.stringify(!u.activo),
      })
      setExito(`Usuario ${u.nombre} ${!u.activo ? 'activado' : 'desactivado'} con éxito.`)
      await cargar()
    } catch (err: any) {
      setError(err.message)
    }
  }

  function solicitarEliminarUsuario(u: UsuarioLista) {
    setUsuarioAEliminar(u)
  }

  async function ejecutarEliminarUsuario() {
    if (!usuarioAEliminar) return
    const u = usuarioAEliminar
    setUsuarioAEliminar(null)
    setError('')
    setExito('')
    try {
      await api(`/api/usuarios/${u.id}`, { method: 'DELETE' })
      setExito(`Usuario "${u.nombre}" eliminado con éxito.`)
      await cargar()
    } catch (err: any) {
      setError(err.message)
    }
  }

  function editar(u: UsuarioLista) {
    setEditando(u.id)
    setForm({
      email: u.email,
      nombre: u.nombre,
      password: '', // Contraseña en blanco por defecto al editar
      rol: u.rol,
    })
    const modulos = u.modulosPermitidos
      ? u.modulosPermitidos.split(',')
      : TODOS_MODULOS
    setModulosSeleccionados(modulos)
    setError('')
    setExito('')
  }

  // Paginación de usuarios
  const totalPaginas = Math.ceil(usuarios.length / ITEMS_POR_PAGINA)
  const usuariosPaginados = usuarios.slice(
    (pagina - 1) * ITEMS_POR_PAGINA,
    pagina * ITEMS_POR_PAGINA
  )

  // Mensaje explicativo según rol seleccionado
  const getRolDescription = () => {
    switch (form.rol) {
      case 'Admin':
        return 'El Administrador tiene control total sobre el sistema, incluyendo la gestión de usuarios, bodegas y configuraciones.'
      case 'Chofer':
        return 'El Chofer tiene permisos para registrar y consultar movimientos de transporte, despachos y entregas de insumos.'
      case 'Almacenero':
        return 'El Almacenero tiene permisos de almacén para controlar existencias físicas y registrar entradas/salidas de inventario.'
      case 'Encargado':
        return 'El Encargado puede gestionar almacenes, auditar inventarios, ver reportes y supervisar movimientos.'
      default:
        return 'Permisos del rol seleccionado para la operación del sistema.'
    }
  }

  if (!esAdmin) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white p-6 rounded-xl border border-red-200 shadow-sm text-center">
        <span className="material-symbols-outlined text-red-600 text-5xl mb-4">gpp_maybe</span>
        <h2 className="text-lg font-bold text-slate-800">Acceso Restringido</h2>
        <p className="text-sm text-slate-500 mt-2">Solo los administradores del sistema pueden gestionar los perfiles de usuario.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 w-full bg-[#001f51] text-white py-2 rounded font-bold hover:bg-primary-container transition-colors cursor-pointer"
        >
          Ir al Panel de Existencias
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-headline-lg text-headline-lg text-[#001f51] font-bold">Gestión de Usuarios</h1>
        <p className="font-body-md text-body-md text-slate-500 mt-2 max-w-2xl">
          Administra los perfiles de acceso, roles jerárquicos y seguridad del personal del centro logístico.
        </p>
      </div>

      {/* Integrated Content Container (Minimalist Redesign) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Left Side: Form (Minimal & Focused) */}
        <aside className="lg:col-span-4 p-8 border-r border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-[#3755c3]">
              {editando === null ? 'person_add' : 'manage_accounts'}
            </span>
            <h2 className="text-xs font-bold text-[#3755c3] uppercase tracking-widest">
              {editando === null ? 'NUEVO USUARIO' : 'EDITAR USUARIO'}
            </h2>
          </div>
          
          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">USUARIO / EMAIL</label>
              <input
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#3755c3] focus:ring-1 focus:ring-[#3755c3] transition-all"
                placeholder="Ej. operador1 o cesar@almacen.com"
                type="text"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">NOMBRE COMPLETO</label>
              <input
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#3755c3] focus:ring-1 focus:ring-[#3755c3] transition-all"
                placeholder="Ej. César Turey"
                type="text"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">CONTRASEÑA</label>
              <div className="relative">
                <input
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#3755c3] focus:ring-1 focus:ring-[#3755c3] transition-all"
                  placeholder={editando === null ? 'Mínimo 8 caracteres' : 'Dejar en blanco para no cambiar'}
                  type={verPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required={editando === null}
                  minLength={8}
                />
                <span
                  onClick={() => setVerPassword(!verPassword)}
                  className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors select-none"
                >
                  {verPassword ? 'visibility' : 'visibility_off'}
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">ROL DEL SISTEMA</label>
              <select
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#3755c3] focus:ring-1 focus:ring-[#3755c3] transition-all cursor-pointer font-semibold text-slate-700"
                value={form.rol}
                onChange={e => setForm({ ...form, rol: e.target.value })}
              >
                <option value="Almacenero">Almacenero</option>
                <option value="Chofer">Chofer</option>
                <option value="Encargado">Encargado</option>
                <option value="Admin">Administrador (Admin)</option>
              </select>
            </div>

            {/* CHECKLIST DE MÓDULOS PERMITIDOS */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-tight">
                  MÓDULOS PERMITIDOS (CHECKLIST)
                </label>
                <button
                  type="button"
                  onClick={() => setModulosSeleccionados(modulosSeleccionados.length === TODOS_MODULOS.length ? [] : TODOS_MODULOS)}
                  className="text-[11px] font-bold text-[#3755c3] hover:underline cursor-pointer"
                >
                  {modulosSeleccionados.length === TODOS_MODULOS.length ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {MODULOS_DISPONIBLES.map(mod => {
                  const check = modulosSeleccionados.includes(mod.id)
                  return (
                    <label
                      key={mod.id}
                      onClick={() => toggleModulo(mod.id)}
                      className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer select-none ${
                        check
                          ? 'bg-white border-[#3755c3] shadow-2xs'
                          : 'bg-slate-100/70 border-slate-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={check}
                        onChange={() => {}}
                        className="w-4 h-4 text-[#3755c3] rounded border-slate-300 focus:ring-[#3755c3] cursor-pointer"
                      />
                      <span className={`material-symbols-outlined text-lg ${check ? 'text-[#3755c3]' : 'text-slate-400'}`}>
                        {mod.icono}
                      </span>
                      <div className="text-xs">
                        <span className={`font-bold block ${check ? 'text-slate-800' : 'text-slate-500'}`}>
                          {mod.nombre}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{mod.desc}</span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Dynamic Permissions Description */}
            <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <span className="material-symbols-outlined text-emerald-600 mt-0.5 text-lg">check_circle</span>
              <p className="text-xs text-emerald-800 leading-relaxed">{getRolDescription()}</p>
            </div>

            {/* Feedback Banners */}
            {error && (
              <div className="text-red-700 text-xs flex items-center gap-1.5 alert bg-red-50 p-2.5 rounded border border-red-200" style={{ color: '#ba1a1a' }}>
                <span className="material-symbols-outlined text-sm shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            {exito && (
              <div className="text-green-700 text-xs flex items-center gap-1.5 alert bg-green-50 p-2.5 rounded border border-green-200">
                <span className="material-symbols-outlined text-sm shrink-0">check_circle</span>
                <span>{exito}</span>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={cargando}
                className="flex-grow bg-[#001f51] hover:bg-[#00337c] text-white py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {cargando ? (
                  <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                ) : (
                  <span className="material-symbols-outlined text-sm">{editando === null ? 'person_add' : 'save'}</span>
                )}
                <span>{editando === null ? 'Crear Cuenta' : 'Guardar'}</span>
              </button>
              {editando !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setEditando(null)
                    setForm(vacio)
                    setError('')
                    setExito('')
                  }}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </aside>

        {/* Right Side: Accounts Table */}
        <section className="lg:col-span-8 p-0 flex flex-col justify-between">
          <div>
            <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <h2 className="text-sm font-bold text-[#001f51] uppercase tracking-wider">CUENTAS REGISTRADAS</h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">Listado activo de usuarios con acceso al sistema</p>
              </div>
              <div className="flex gap-2">
                <button className="!p-2 !bg-white border border-slate-200 rounded-lg hover:bg-slate-50 !text-slate-500 transition-colors cursor-pointer flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">filter_list</span>
                </button>
                <button className="!p-2 !bg-white border border-slate-200 rounded-lg hover:bg-slate-50 !text-slate-500 transition-colors cursor-pointer flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">download</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">USUARIO / EMAIL</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">NOMBRE</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">ROL</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">MÓDULOS</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">ESTADO</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuariosPaginados.map(u => {
                    const mods = u.modulosPermitidos ? u.modulosPermitidos.split(',') : TODOS_MODULOS
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 font-semibold text-sm text-[#001f51]">{u.email}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{u.nombre}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.rol === 'Admin' ? 'bg-[#d9e2ff] text-[#173bab]' : 'bg-slate-100 text-slate-500'}`}>
                            {u.rol}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {mods.map(m => (
                              <span key={m} className="px-1.5 py-0.5 bg-blue-50 text-[#3755c3] border border-blue-100 rounded text-[9px] font-bold uppercase">
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>
                      <td className="px-8 py-4.5 text-center">
                        <button
                          onClick={() => cambiarActivo(u)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50/30 rounded-full border border-emerald-100 hover:bg-emerald-50 transition-colors cursor-pointer focus:outline-none"
                          style={!u.activo ? { backgroundColor: '#fdf2f2', borderColor: '#fde8e8' } : {}}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${u.activo ? 'text-emerald-700' : 'text-red-700'}`}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </button>
                      </td>
                      <td className="px-8 py-4.5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => editar(u)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-[#3755c3]/10 hover:text-[#3755c3] transition-all cursor-pointer !text-slate-500 !bg-white !p-0"
                            title="Editar usuario"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => solicitarEliminarUsuario(u)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-red-50 hover:text-[#ba1a1a] transition-all cursor-pointer !text-slate-500 !bg-white !p-0"
                            title="Eliminar usuario"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPaginas > 1 && (
            <div className="p-8 flex items-center justify-between border-t border-slate-100 bg-white">
              <p className="text-xs font-bold text-slate-400">
                Mostrando {Math.min((pagina - 1) * ITEMS_POR_PAGINA + 1, usuarios.length)}-
                {Math.min(pagina * ITEMS_POR_PAGINA, usuarios.length)} de {usuarios.length} usuarios
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagina(pagina - 1)}
                  disabled={pagina === 1}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold !text-slate-500 !bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  ANTERIOR
                </button>
                <button
                  onClick={() => setPagina(pagina + 1)}
                  disabled={pagina === totalPaginas}
                  className="px-4 py-2 !bg-[#eff4ff] !text-[#3755c3] border border-slate-200 rounded-lg text-xs font-bold hover:bg-[#e0ebff] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  SIGUIENTE
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* System Health / Quick Stats (Subtle Bento Pattern) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="p-6 bg-white border border-slate-200 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-[#3755c3]">
            <span className="material-symbols-outlined text-[#3755c3]">security</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">POLÍTICA DE SEGURIDAD</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">Cumplimiento: 100%</p>
          </div>
        </div>
        
        <div className="p-6 bg-white border border-slate-200 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-[#001f51]">
            <span className="material-symbols-outlined text-[#001f51]">history</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ÚLTIMO ACCESO</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">Hace un momento</p>
          </div>
        </div>
        
        <div className="p-6 bg-white border border-slate-200 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-[#001f51]">
            <span className="material-symbols-outlined text-[#001f51]">key</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">REINICIOS REQUERIDOS</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">0 Pendientes</p>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación de Usuario Premium */}
      {usuarioAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 mx-4 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>

            <div>
              <h3 className="text-base font-bold text-[#001f51]">¿Eliminar Usuario?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                ¿Estás seguro de eliminar permanentemente a <strong>"{usuarioAEliminar.nombre}"</strong> ({usuarioAEliminar.email})?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUsuarioAEliminar(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer !bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={ejecutarEliminarUsuario}
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
