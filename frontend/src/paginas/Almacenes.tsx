import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api/cliente'
import type { Almacen } from '../api/tipos'
import { useAuth } from '../auth/AuthContext'

const vacio = { nombre: '', ubicacion: '', activo: true }

export default function Almacenes() {
  const { sesion } = useAuth()
  const esAdmin = sesion?.rol === 'Admin'
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [form, setForm] = useState(vacio)
  const [editando, setEditando] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  async function cargar() {
    setAlmacenes(await api<Almacen[]>('/api/almacenes'))
  }
  
  useEffect(() => { 
    cargar().catch(e => setError(e.message)) 
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setExito('')
    try {
      if (editando === null) {
        await api('/api/almacenes', { method: 'POST', body: JSON.stringify(form) })
        setExito('Almacén creado con éxito.')
      } else {
        await api(`/api/almacenes/${editando}`, {
          method: 'PUT', body: JSON.stringify({ ...form, id: editando }),
        })
        setExito('Almacén actualizado con éxito.')
      }
      setForm(vacio)
      setEditando(null)
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.')
    }
  }

  // Métricas para Bento Grid
  const totalAlmacenes = almacenes.length
  const activosAlmacenes = almacenes.filter(a => a.activo).length
  const inactivosAlmacenes = totalAlmacenes - activosAlmacenes

  return (
    <>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="font-headline-lg text-headline-lg text-[#001f51] font-bold">Gestión de Almacenes</h1>
        <p className="font-body-md text-body-md text-slate-500 mt-2 max-w-xl">
          Administra las bodegas físicas, sucursales y ubicaciones logísticas para el control de inventario.
        </p>
      </div>

      {/* Main Grid: Form on Left, Table on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
        
        {/* Form Container (only visible to Admins) */}
        {esAdmin ? (
          <form className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6" onSubmit={onSubmit}>
            <div>
              <h2 className="text-sm font-bold text-[#001f51] uppercase tracking-wider">
                {editando === null ? 'Registrar Almacén' : 'Editar Almacén'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Define el nombre y la ubicación de la bodega</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-700 text-xs flex items-center gap-1.5 alert bg-red-50 p-3 rounded-lg border border-red-200" style={{ color: '#ba1a1a' }}>
                <span className="material-symbols-outlined text-sm shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {exito && (
              <div className="text-green-700 text-xs flex items-center gap-1.5 alert bg-green-50 p-3 rounded-lg border border-green-200">
                <span className="material-symbols-outlined text-sm shrink-0">check_circle</span>
                <span>{exito}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">NOMBRE DEL ALMACÉN</label>
                <input
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  required
                  placeholder="Ej. Almacén Central"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">UBICACIÓN / DIRECCIÓN</label>
                <input
                  value={form.ubicacion}
                  onChange={e => setForm({ ...form, ubicacion: e.target.value })}
                  placeholder="Ej. Av. Libertador 450, Piso 1"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">ESTADO OPERATIVO</label>
                <select
                  value={String(form.activo)}
                  onChange={e => setForm({ ...form, activo: e.target.value === 'true' })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3] transition-all cursor-pointer font-medium"
                >
                  <option value="true">Activo (Habilitado para movimientos)</option>
                  <option value="false">Inactivo (Deshabilitado)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {editando !== null && (
                <button
                  type="button"
                  onClick={() => { setEditando(null); setForm(vacio); setError(''); setExito(''); }}
                  className="w-1/2 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer text-center !bg-transparent"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className={`py-2.5 bg-[#001f51] hover:bg-[#00337c] text-white rounded-lg text-xs font-bold shadow transition-all cursor-pointer ${editando !== null ? 'w-1/2' : 'w-full'}`}
              >
                {editando === null ? 'Registrar' : 'Guardar'}
              </button>
            </div>
          </form>
        ) : (
          <div className="lg:col-span-4 bg-[#f8fafc] border border-slate-200 rounded-xl p-6 text-center">
            <span className="material-symbols-outlined text-[#001f51]/40 text-4xl mb-3">lock</span>
            <p className="text-xs font-bold text-[#001f51] uppercase tracking-wider mb-1">Acceso Restringido</p>
            <p className="text-[11px] text-slate-500">Solo los administradores pueden añadir o modificar almacenes en el sistema.</p>
          </div>
        )}

        {/* Table Container */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-white">
            <div>
              <h2 className="text-sm font-bold text-[#001f51] uppercase tracking-wider">BODEGAS REGISTRADAS</h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">Lista de almacenes disponibles para el inventario</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre del Almacén</th>
                  <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Ubicación / Dirección</th>
                  <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Estado</th>
                  {esAdmin && <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {almacenes.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-4 flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#3755c3] bg-blue-50 p-2 rounded-full text-base">storefront</span>
                      <p className="font-semibold text-sm text-[#001f51] leading-tight">{a.nombre}</p>
                    </td>
                    <td className="px-8 py-4 text-xs text-slate-500 font-semibold">
                      {a.ubicacion || <span className="text-slate-300 italic">Sin ubicación</span>}
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${a.activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                        {a.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {esAdmin && (
                      <td className="px-8 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditando(a.id)
                            setForm({ nombre: a.nombre, ubicacion: a.ubicacion ?? '', activo: a.activo })
                            setError('')
                            setExito('')
                          }}
                          className="material-symbols-outlined !text-slate-400 hover:text-[#3755c3] transition-colors cursor-pointer text-lg !p-1 hover:bg-slate-100 rounded-full !bg-white border border-slate-150 flex items-center justify-center inline-flex"
                          title="Editar almacén"
                        >
                          edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bento Grid Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-[#3755c3] rounded-lg">
            <span className="material-symbols-outlined text-2xl">warehouse</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Almacenes Registrados</p>
            <h3 className="text-2xl font-bold text-[#001f51] mt-0.5">{totalAlmacenes}</h3>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <span className="material-symbols-outlined text-2xl">check_circle</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Habilitados / Activos</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{activosAlmacenes}</h3>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-500 rounded-lg">
            <span className="material-symbols-outlined text-2xl">cancel</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deshabilitados / Inactivos</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{inactivosAlmacenes}</h3>
          </div>
        </div>
      </section>
    </>
  )
}
