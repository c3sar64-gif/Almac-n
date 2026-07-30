import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api/cliente'
import type { Almacen, Producto, RecepcionMateriaPrima as RecepcionType } from '../api/tipos'

// Supabase S3 Config
const SUPABASE_S3_ENDPOINT = 'https://spfbypyhdsgbekohihxd.storage.supabase.co/storage/v1/s3'
const BUCKET_NAME = 'media_almac-n'
const ACCESS_KEY = 'cf4528ea82aedab3ebdf2eb26bd4d3dd'

export default function RecepcionMateriaPrimaPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [recepciones, setRecepciones] = useState<RecepcionType[]>([])

  // Form State
  const [productoId, setProductoId] = useState('')
  const [almacenId, setAlmacenId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [numeroGuia, setNumeroGuia] = useState('')
  const [numeroLote, setNumeroLote] = useState('')
  const [fechaFabricacion, setFechaFabricacion] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  
  // Checklist Calidad
  const [empaqueConforme, setEmpaqueConforme] = useState(true)
  const [aspectoConforme, setAspectoConforme] = useState(true)
  const [temperatura, setTemperatura] = useState('')
  const [dictamenCalidad, setDictamenCalidad] = useState<number>(1) // 1=Aprobado, 2=Rechazado, 3=Condicional
  const [observaciones, setObservaciones] = useState('')
  
  // Adjunto Ficha Técnica
  const [fichaArchivo, setFichaArchivo] = useState<File | null>(null)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)
  const [fichaTecnicaUrl, setFichaTecnicaUrl] = useState('')

  // Control UI
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  useEffect(() => {
    api<Producto[]>('/api/productos').then(p => setProductos(p.filter(x => x.activo))).catch(() => {})
    api<Almacen[]>('/api/almacenes').then(a => setAlmacenes(a.filter(x => x.activo))).catch(() => {})
    cargarHistorial()
  }, [])

  const cargarHistorial = () => {
    api<RecepcionType[]>('/api/recepciones')
      .then(setRecepciones)
      .catch(() => {})
  }

  // Generador de código de Lote Automático
  const generarLoteAuto = () => {
    const hoyStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const rand = Math.floor(100 + Math.random() * 900)
    setNumeroLote(`LOT-${hoyStr}-${rand}`)
  }

  // Subir archivo a Supabase S3
  const subirFichaTecnica = async (file: File): Promise<string> => {
    setSubiendoArchivo(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `fichas-tecnicas/FT_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const uploadUrl = `${SUPABASE_S3_ENDPOINT}/${BUCKET_NAME}/${fileName}`

    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'x-amz-acl': 'public-read',
        'authorization': `Bearer ${ACCESS_KEY}`,
        'content-type': file.type,
      },
      body: file,
    })

    setSubiendoArchivo(false)
    if (!res.ok) {
      throw new Error('Error al subir el archivo de Ficha Técnica a Supabase S3')
    }

    return `https://spfbypyhdsgbekohihxd.supabase.co/storage/v1/object/public/${BUCKET_NAME}/${fileName}`
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setExito('')
    setCargando(true)

    try {
      let finalFichaUrl = fichaTecnicaUrl

      if (fichaArchivo) {
        finalFichaUrl = await subirFichaTecnica(fichaArchivo)
      }

      await api('/api/recepciones', {
        method: 'POST',
        body: JSON.stringify({
          productoId: Number(productoId),
          almacenId: Number(almacenId),
          cantidadRecibida: Number(cantidad),
          proveedor: proveedor.trim(),
          numeroGuiaFactura: numeroGuia ? numeroGuia.trim() : null,
          numeroLote: numeroLote.trim(),
          fechaFabricacion: fechaFabricacion ? `${fechaFabricacion}T12:00:00Z` : null,
          fechaVencimiento: fechaVencimiento ? `${fechaVencimiento}T12:00:00Z` : null,
          empaqueConforme,
          aspectoConforme,
          temperatura: temperatura || null,
          dictamenCalidad: Number(dictamenCalidad),
          observaciones: observaciones || null,
          fichaTecnicaUrl: finalFichaUrl || null
        })
      })

      const dictamenNombre = dictamenCalidad === 1 ? 'APROBADO (Ingresado a Inventario)' : dictamenCalidad === 2 ? 'RECHAZADO' : 'CONDICIONAL'
      setExito(`Acta de Recepción de Materia Prima registrada con éxito con Dictamen: ${dictamenNombre}.`)

      // Reset Form
      setProductoId('')
      setAlmacenId('')
      setCantidad('')
      setProveedor('')
      setNumeroGuia('')
      setNumeroLote('')
      setFechaFabricacion('')
      setFechaVencimiento('')
      setEmpaqueConforme(true)
      setAspectoConforme(true)
      setTemperatura('')
      setDictamenCalidad(1)
      setObservaciones('')
      setFichaArchivo(null)
      setFichaTecnicaUrl('')

      cargarHistorial()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  const productoSel = productos.find(p => p.id === Number(productoId))

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-[#001f51] p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
              Protocolo BPM / HACCP
            </span>
            <span className="text-blue-200 text-xs">• Control de Calidad al Ingreso</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Recepción e Inspección de Materia Prima</h1>
          <p className="text-xs text-blue-200 mt-1 max-w-xl">
            Registra el ingreso de harina, insumos y empaques con verificación de calidad, certificados y asignación automática de lotes.
          </p>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {error && (
        <div className="text-red-700 text-xs flex items-center gap-1.5 bg-red-50 p-4 rounded-xl border border-red-200">
          <span className="material-symbols-outlined text-base shrink-0">error</span>
          <span>{error}</span>
        </div>
      )}

      {exito && (
        <div className="text-emerald-800 text-xs flex items-center gap-1.5 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <span className="material-symbols-outlined text-base shrink-0 text-emerald-600">check_circle</span>
          <span className="font-bold">{exito}</span>
        </div>
      )}

      {/* FORMULARIO DE RECEPCIÓN & CONTROL DE CALIDAD */}
      <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <h2 className="text-sm font-extrabold text-[#001f51] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="material-symbols-outlined text-blue-600">assignment_turned_in</span>
          <span>Nueva Acta de Recepción e Inspección</span>
        </h2>

        {/* SEC 1: DATOS DE CARGA Y PROVEEDOR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="producto" className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-tighter">Insumo / Materia Prima *</label>
            <select
              id="producto"
              value={productoId}
              onChange={e => setProductoId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-[#001f51] outline-none focus:border-[#3755c3]"
            >
              <option value="">-- Seleccionar --</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="almacen" className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-tighter">Almacén Destino *</label>
            <select
              id="almacen"
              value={almacenId}
              onChange={e => setAlmacenId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-[#3755c3]"
            >
              <option value="">-- Seleccionar --</option>
              {almacenes.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cantidad" className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-tighter">
              Cantidad Recibida ({productoSel?.unidadMedida ?? 'Unidades'}) *
            </label>
            <input
              id="cantidad"
              type="number"
              min="0.001"
              step="any"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              required
              placeholder="0.00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-[#001f51] outline-none focus:border-[#3755c3]"
            />
          </div>

          <div>
            <label htmlFor="proveedor" className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-tighter">Proveedor *</label>
            <input
              id="proveedor"
              type="text"
              value={proveedor}
              onChange={e => setProveedor(e.target.value)}
              required
              placeholder="Ej. Molinos del Sur / Alicorp"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3]"
            />
          </div>
        </div>

        {/* SEC 2: DATOS DE LOTE Y VENCIMIENTO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="lote" className="text-xs font-bold text-slate-700 uppercase tracking-tighter">Número de Lote *</label>
              <button
                type="button"
                onClick={generarLoteAuto}
                className="text-[10px] text-[#3755c3] font-bold underline hover:text-blue-900 cursor-pointer"
              >
                Auto-generar Lote
              </button>
            </div>
            <input
              id="lote"
              type="text"
              value={numeroLote}
              onChange={e => setNumeroLote(e.target.value)}
              required
              placeholder="Ej. LOT-2026-M101"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-[#001f51] outline-none focus:border-[#3755c3]"
            />
          </div>

          <div>
            <label htmlFor="fechaFab" className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tighter">Fecha de Fabricación</label>
            <input
              id="fechaFab"
              type="date"
              value={fechaFabricacion}
              onChange={e => setFechaFabricacion(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3]"
            />
          </div>

          <div>
            <label htmlFor="fechaVenc" className="block text-xs font-bold text-amber-800 mb-1 uppercase tracking-tighter">Fecha de Vencimiento *</label>
            <input
              id="fechaVenc"
              type="date"
              value={fechaVencimiento}
              onChange={e => setFechaVencimiento(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-900 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* SEC 3: PROTOCOLO CHECKLIST DE CALIDAD (BPM) */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <h3 className="text-xs font-black text-[#001f51] uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-amber-500">verified</span>
            <span>Checklist de Calidad al Recibir (Inspección Física)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Empaque Conforme Toggle */}
            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-colors">
              <input
                type="checkbox"
                checked={empaqueConforme}
                onChange={e => setEmpaqueConforme(e.target.checked)}
                className="w-4 h-4 text-[#3755c3] rounded border-slate-300 focus:ring-[#3755c3]"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Empaque / Sacos Integró</span>
                <span className="text-[10px] text-slate-500">Limpio, sellado, sin humedad o plagas</span>
              </div>
            </label>

            {/* Aspecto Conforme Toggle */}
            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-colors">
              <input
                type="checkbox"
                checked={aspectoConforme}
                onChange={e => setAspectoConforme(e.target.checked)}
                className="w-4 h-4 text-[#3755c3] rounded border-slate-300 focus:ring-[#3755c3]"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Aspecto Organoléptico</span>
                <span className="text-[10px] text-slate-500">Color, olor y textura conformes</span>
              </div>
            </label>

            {/* Temperatura opcional */}
            <div>
              <label htmlFor="temp" className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-tighter">Temperatura / Estado especial</label>
              <input
                id="temp"
                type="text"
                value={temperatura}
                onChange={e => setTemperatura(e.target.value)}
                placeholder="Ej. Ambiente / 18°C"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3]"
              />
            </div>
          </div>
        </div>

        {/* SEC 4: DICTAMEN FINAL Y DOCUMENTO ADJUNTO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-slate-100 pt-4">
          {/* Selector de Dictamen */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-tighter">Dictamen Final de Calidad *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDictamenCalidad(1)}
                className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                  dictamenCalidad === 1
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>APROBADO</span>
              </button>

              <button
                type="button"
                onClick={() => setDictamenCalidad(2)}
                className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                  dictamenCalidad === 2
                    ? 'bg-red-600 text-white border-red-700 shadow-sm'
                    : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                }`}
              >
                <span className="material-symbols-outlined text-base">cancel</span>
                <span>RECHAZADO</span>
              </button>

              <button
                type="button"
                onClick={() => setDictamenCalidad(3)}
                className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                  dictamenCalidad === 3
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span className="material-symbols-outlined text-base">help</span>
                <span>CONDICIONAL</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 italic">
              * Nota: Si el dictamen es <strong>APROBADO</strong>, el lote ingresará inmediatamente al stock disponible del almacén.
            </p>
          </div>

          {/* Adjuntar Ficha Técnica / Certificado */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tighter">
              Adjuntar Ficha Técnica o Certificado de Calidad (PDF / Foto)
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  setFichaArchivo(e.target.files[0])
                }
              }}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#3755c3]/10 file:text-[#3755c3] hover:file:bg-[#3755c3]/20 cursor-pointer"
            />
            {subiendoArchivo && (
              <span className="text-[11px] text-blue-600 font-bold block mt-1">Subiendo documento a Nube Supabase S3...</span>
            )}
          </div>
        </div>

        {/* Observaciones */}
        <div>
          <label htmlFor="obs" className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tighter">Observaciones Adicionales</label>
          <textarea
            id="obs"
            rows={2}
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            placeholder="Ingrese cualquier detalle adicional sobre la recepción, transporte o empaque..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#3755c3]"
          />
        </div>

        {/* Botón de Enviar */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={cargando || subiendoArchivo}
            className="px-6 py-3 bg-[#001f51] hover:bg-[#00337c] text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {cargando ? (
              <span className="material-symbols-outlined text-base animate-spin">refresh</span>
            ) : (
              <span className="material-symbols-outlined text-base">save</span>
            )}
            <span>Registrar Acta de Recepción</span>
          </button>
        </div>
      </form>

      {/* TABLA DE HISTORIAL DE RECEPCIONES */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#001f51] uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[#3755c3]">history</span>
            <span>Historial de Actas de Recepción e Inspección</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">Total actas: {recepciones.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left divide-y divide-slate-100 text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                <th className="p-4">FECHA / HORA</th>
                <th className="p-4">INSUMO</th>
                <th className="p-4 text-right">CANTIDAD</th>
                <th className="p-4">LOTE / VENCIMIENTO</th>
                <th className="p-4">PROVEEDOR</th>
                <th className="p-4 text-center">DICTAMEN</th>
                <th className="p-4 text-center">DOCUMENTO</th>
                <th className="p-4">OPERADOR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recepciones.length > 0 ? (
                recepciones.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-500 font-medium whitespace-nowrap">
                      {new Date(r.fechaRecepcion).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[#001f51]">{r.producto.nombre}</div>
                      <div className="text-[10px] text-slate-400">{r.almacen.nombre}</div>
                    </td>
                    <td className="p-4 text-right font-black text-slate-800">
                      {r.cantidadRecibida} {r.producto.unidadMedida}
                    </td>
                    <td className="p-4">
                      <div className="font-mono font-bold text-slate-800">{r.numeroLote}</div>
                      <div className="text-[10px] text-slate-500">Vence: {r.fechaVencimiento || 'Sin fecha'}</div>
                    </td>
                    <td className="p-4 font-semibold text-slate-700">
                      {r.proveedor}
                      {r.numeroGuiaFactura && <div className="text-[10px] text-slate-400 font-normal">Guía: {r.numeroGuiaFactura}</div>}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${
                        r.dictamenNum === 1
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : r.dictamenNum === 2
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {r.dictamenCalidad}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {r.fichaTecnicaUrl ? (
                        <a
                          href={r.fichaTecnicaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-[#3755c3] hover:bg-blue-100 rounded text-[10px] font-bold border border-blue-200 transition-colors"
                        >
                          <span className="material-symbols-outlined text-xs">description</span>
                          <span>Ver Ficha</span>
                        </a>
                      ) : (
                        <span className="text-slate-300 italic text-[10px]">Sin adjunto</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 font-medium">
                      {r.usuario}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    No se registran actas de recepción de materia prima en el historial.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
