import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/cliente'
import type { Producto } from '../api/tipos'

const vacio: Omit<Producto, 'id'> = {
  sku: '',
  nombre: '',
  descripcion: '',
  categoria: '',
  unidadMedida: 'pieza',
  activo: true,
  imagenUrl: '',
}

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [form, setForm] = useState(vacio)
  const [editando, setEditando] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [cargando, setCargando] = useState(false)
  const [pagina, setPagina] = useState(1)

  const ITEMS_POR_PAGINA = 5

  const [modalUnidadAbierto, setModalUnidadAbierto] = useState(false)
  const [nuevaUnidadNombre, setNuevaUnidadNombre] = useState('')
  const [modalUnidadError, setModalUnidadError] = useState('')

  const [unidades, setUnidades] = useState<string[]>(() => {
    const guardadas = localStorage.getItem('unidades_medida')
    return guardadas ? JSON.parse(guardadas) : ['pieza', 'caja', 'paquete', 'kilogramo', 'litro', 'metro', 'unidad']
  })

  async function cargar() {
    setProductos(await api<Producto[]>('/api/productos'))
  }

  useEffect(() => {
    cargar().catch(e => setError(e.message))
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setExito('')
    setCargando(true)
    try {
      const payload = {
        ...form,
        descripcion: form.descripcion || null,
        categoria: form.categoria || null,
        imagenUrl: form.imagenUrl || null,
      }
      if (editando === null) {
        await api('/api/productos', { method: 'POST', body: JSON.stringify(payload) })
        setExito('Producto creado con éxito.')
      } else {
        await api(`/api/productos/${editando}`, {
          method: 'PUT',
          body: JSON.stringify({ ...payload, id: editando }),
        })
        setExito('Producto actualizado con éxito.')
      }
      setForm(vacio)
      setEditando(null)
      await cargar()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  function editar(p: Producto) {
    setEditando(p.id)
    setForm({
      sku: p.sku,
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      categoria: p.categoria ?? '',
      unidadMedida: p.unidadMedida,
      activo: p.activo,
      imagenUrl: p.imagenUrl ?? '',
    })
    setError('')
    setExito('')
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setExito('')
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const sesion = localStorage.getItem('almacen.sesion')
      const token = sesion ? JSON.parse(sesion).token : null
      
      const query = new URLSearchParams()
      if (form.categoria) query.set('categoria', form.categoria)
      if (form.sku) query.set('sku', form.sku)

      const baseUrl = import.meta.env.VITE_API_URL || '';
      const uploadUrl = `${baseUrl.replace(/\/$/, '')}/api/productos/upload-imagen?${query}`

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData
      })
      
      if (!res.ok) {
        let mensaje = `Error ${res.status}`
        try {
          const body = await res.json()
          if (body?.error) mensaje = body.error
        } catch {}
        throw new Error(mensaje)
      }
      
      const data = await res.json()
      setForm(prev => ({ ...prev, imagenUrl: data.url }))
      setExito('Imagen subida con éxito.')
    } catch (err: any) {
      setError(`Error al subir imagen: ${err.message}`)
    }
  }

  // Paginación
  const totalPaginas = Math.ceil(productos.length / ITEMS_POR_PAGINA)
  const productosPaginados = productos.slice(
    (pagina - 1) * ITEMS_POR_PAGINA,
    pagina * ITEMS_POR_PAGINA
  )

  // Bento Stats
  const totalProductos = productos.length
  const totalActivos = productos.filter(p => p.activo).length
  const categoriasUnicas = Array.from(new Set(productos.map(p => p.categoria).filter(Boolean))).length

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-headline-lg text-headline-lg text-[#001f51] font-bold">Catálogo de Productos</h1>
        <p className="font-body-md text-body-md text-slate-500 mt-2 max-w-2xl">
          Administra la información de los ítems, descripciones, categorías y fotografías del inventario general.
        </p>
      </div>

      {/* Main Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Left Side: Product Form */}
        <aside className="lg:col-span-4 p-8 border-r border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-[#3755c3]">
              {editando === null ? 'add_box' : 'edit_note'}
            </span>
            <h2 className="text-xs font-bold text-[#3755c3] uppercase tracking-widest">
              {editando === null ? 'NUEVO PRODUCTO' : 'EDITAR PRODUCTO'}
            </h2>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">CÓDIGO SKU (ÚNICO)</label>
              <input
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#3755c3] focus:ring-1 focus:ring-[#3755c3] transition-all"
                placeholder="Ej. LAP-HP-15"
                type="text"
                value={form.sku}
                onChange={e => setForm({ ...form, sku: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">NOMBRE DEL PRODUCTO</label>
              <input
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#3755c3] focus:ring-1 focus:ring-[#3755c3] transition-all"
                placeholder="Ej. Laptop HP Pavilion 15"
                type="text"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">CATEGORÍA</label>
                <input
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#3755c3] focus:ring-1 focus:ring-[#3755c3] transition-all"
                  placeholder="Ej. Tecnología"
                  type="text"
                  value={form.categoria ?? ''}
                  onChange={e => setForm({ ...form, categoria: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">UNIDAD MEDIDA</label>
                <div className="flex gap-2">
                  <select
                    className="flex-grow px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#3755c3] focus:ring-1 focus:ring-[#3755c3] transition-all cursor-pointer font-semibold text-slate-700 capitalize"
                    value={form.unidadMedida}
                    onChange={e => setForm({ ...form, unidadMedida: e.target.value })}
                    required
                  >
                    <option value="" disabled>Seleccionar...</option>
                    {unidades.map(u => (
                      <option key={u} value={u} className="capitalize">{u}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setModalUnidadAbierto(true)}
                    className="px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#001f51] font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center !bg-transparent"
                    title="Añadir nueva unidad"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">DESCRIPCIÓN</label>
              <input
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#3755c3] focus:ring-1 focus:ring-[#3755c3] transition-all"
                placeholder="Detalle o especificación breve"
                type="text"
                value={form.descripcion ?? ''}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">FOTOGRAFÍA DEL PRODUCTO</label>
              <div className="flex gap-2">
                <input
                  className="flex-grow px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#3755c3] focus:ring-1 focus:ring-[#3755c3] transition-all"
                  placeholder="Pegar link de imagen o subir archivo →"
                  type="text"
                  value={form.imagenUrl ?? ''}
                  onChange={e => setForm({ ...form, imagenUrl: e.target.value })}
                />
                <label className="!bg-[#eff4ff] hover:bg-slate-100 text-[#3755c3] px-4 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 shrink-0 select-none !p-3">
                  <span className="material-symbols-outlined text-lg">cloud_upload</span>
                  <span>Subir</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Puedes pegar un link directo o subir una foto desde tu equipo.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">ESTADO</label>
              <select
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#3755c3] focus:ring-1 focus:ring-[#3755c3] transition-all cursor-pointer"
                value={String(form.activo)}
                onChange={e => setForm({ ...form, activo: e.target.value === 'true' })}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>

            {/* Preview container if image URL is supplied */}
            {form.imagenUrl && (
              <div className="p-3 border border-slate-200 rounded-lg bg-white flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 self-start">VISTA PREVIA DE LA FOTO</span>
                <img
                  src={form.imagenUrl}
                  alt="Previsualización"
                  className="max-h-24 object-contain rounded border border-slate-100"
                  onError={e => {
                    ;(e.target as HTMLImageElement).src =
                      'https://placehold.co/100x100?text=Error'
                  }}
                />
              </div>
            )}

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
                  <span className="material-symbols-outlined text-sm">{editando === null ? 'add' : 'save'}</span>
                )}
                <span>{editando === null ? 'Crear Producto' : 'Guardar'}</span>
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

        {/* Right Side: Product Catalog Table */}
        <section className="lg:col-span-8 p-0 flex flex-col justify-between">
          <div>
            <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <h2 className="text-sm font-bold text-[#001f51] uppercase tracking-wider">ÍTEMS REGISTRADOS</h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">Lista global de productos del sistema</p>
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
                    <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">PRODUCTO / FOTO</th>
                    <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">CATEGORÍA</th>
                    <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">UNIDAD</th>
                    <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">ESTADO</th>
                    <th className="px-8 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productosPaginados.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-4 flex items-center gap-3">
                        {/* Thumbnail circle */}
                        <div className="w-10 h-10 rounded-lg border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                          {p.imagenUrl ? (
                            <img
                              src={p.imagenUrl}
                              alt={p.nombre}
                              className="w-full h-full object-cover"
                              onError={e => {
                                ;(e.target as HTMLImageElement).src =
                                  'https://placehold.co/40x40?text=Error'
                              }}
                            />
                          ) : (
                            <span className="material-symbols-outlined text-slate-400 text-lg">inventory_2</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-[#001f51] leading-tight">{p.nombre}</p>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5 uppercase tracking-tighter">SKU: {p.sku}</p>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-sm text-slate-500">
                        {p.categoria ? (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                            {p.categoria}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic text-xs">Sin categoría</span>
                        )}
                      </td>
                      <td className="px-8 py-4 text-sm text-slate-500">{p.unidadMedida}</td>
                      <td className="px-8 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${p.activo ? 'bg-emerald-50/30 border-emerald-100 text-emerald-700' : 'bg-red-50/30 border-red-100 text-red-700'} text-[10px] font-bold uppercase tracking-wider`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.activo ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => editar(p)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-[#3755c3]/10 hover:text-[#3755c3] transition-all cursor-pointer !text-slate-500 !bg-white !p-0"
                            title="Editar producto"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPaginas > 1 && (
            <div className="p-8 flex items-center justify-between border-t border-slate-100 bg-white">
              <p className="text-xs font-bold text-slate-400">
                Mostrando {Math.min((pagina - 1) * ITEMS_POR_PAGINA + 1, productos.length)}-
                {Math.min(pagina * ITEMS_POR_PAGINA, productos.length)} de {productos.length} productos
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

      {/* Summary Stats (Bento Pattern) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="p-6 bg-white border border-slate-200 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-[#001f51]">
            <span className="material-symbols-outlined text-[#001f51]">inventory_2</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">PRODUCTOS TOTALES</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{totalProductos} ítems</p>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-700">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ÍTEMS ACTIVOS</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{totalActivos} activos</p>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-[#3755c3]">
            <span className="material-symbols-outlined text-[#3755c3]">category</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">CATEGORÍAS DE CATÁLOGO</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{categoriasUnicas} activas</p>
          </div>
        </div>
      </div>

      {modalUnidadAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 mx-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-[#3755c3] bg-blue-50 p-2 rounded-full">square_foot</span>
              <h3 className="text-sm font-bold text-[#001f51] uppercase tracking-wider">Nueva Unidad de Medida</h3>
            </div>
            
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Registra una nueva unidad de medida para los productos en el catálogo (ej. Litro, Caja, Rollo).
            </p>

            {modalUnidadError && (
              <div className="text-red-700 text-xs flex items-center gap-1.5 alert bg-red-50 p-2.5 rounded-lg border border-red-200 mb-4" style={{ color: '#ba1a1a' }}>
                <span className="material-symbols-outlined text-sm shrink-0">error</span>
                <span>{modalUnidadError}</span>
              </div>
            )}

            <form onSubmit={(e) => {
              e.preventDefault()
              setModalUnidadError('')
              const nuevaNormalizada = nuevaUnidadNombre.trim().toLowerCase()
              if (!nuevaNormalizada) {
                setModalUnidadError('El nombre no puede estar vacío.')
                return
              }
              if (unidades.includes(nuevaNormalizada)) {
                setModalUnidadError('Esta unidad de medida ya existe.')
                return
              }
              const listaActualizada = [...unidades, nuevaNormalizada]
              setUnidades(listaActualizada)
              localStorage.setItem('unidades_medida', JSON.stringify(listaActualizada))
              setForm(prev => ({ ...prev, unidadMedida: nuevaNormalizada }))
              setNuevaUnidadNombre('')
              setModalUnidadAbierto(false)
            }}>
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tighter">NOMBRE DE LA UNIDAD</label>
                <input
                  type="text"
                  required
                  value={nuevaUnidadNombre}
                  onChange={e => setNuevaUnidadNombre(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#3755c3] focus:ring-1 focus:ring-[#3755c3] transition-all"
                  placeholder="Ej. Rollo o Docena"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setModalUnidadAbierto(false); setNuevaUnidadNombre(''); setModalUnidadError(''); }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-colors cursor-pointer !bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#001f51] hover:bg-[#00337c] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
