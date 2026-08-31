import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api/cliente'
import type { Almacen, Producto, RecepcionMateriaPrima as RecepcionType } from '../api/tipos'
import { useAuth } from '../auth/AuthContext'

// Supabase S3 Config
const SUPABASE_S3_ENDPOINT = 'https://spfbypyhdsgbekohihxd.storage.supabase.co/storage/v1/s3'
const BUCKET_NAME = 'media_almac-n'
const ACCESS_KEY = 'cf4528ea82aedab3ebdf2eb26bd4d3dd'

export default function RecepcionMateriaPrimaPage() {
  const { sesion } = useAuth()
  const [productos, setProductos] = useState<Producto[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [recepciones, setRecepciones] = useState<RecepcionType[]>([])

  // Fecha por defecto hoy
  const getTodayStr = () => new Date().toISOString().slice(0, 10)

  // Form State - I. Información del Producto
  const [fechaRecepcion, setFechaRecepcion] = useState(getTodayStr())
  const [productoId, setProductoId] = useState('')
  const [almacenId, setAlmacenId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [registroSenasag, setRegistroSenasag] = useState('')
  const [numeroGuia, setNumeroGuia] = useState('')
  const [nombreTransportista, setNombreTransportista] = useState('')
  const [numeroLote, setNumeroLote] = useState('')
  const [fechaFabricacion, setFechaFabricacion] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')

  // Form State - II. Documentación
  const [docCuentaConFacturaFichaCalidad, setDocCuentaConFacturaFichaCalidad] = useState(true)
  const [docCoincidePedido, setDocCoincidePedido] = useState(true)

  // Form State - III. Transporte y Vehículo
  const [transpVehiculoLimpio, setTranspVehiculoLimpio] = useState(true)
  const [transpMercanciaEstibada, setTranspMercanciaEstibada] = useState(true)

  // Form State - IV. EMPAQUES
  const [empaqueEtiquetasLegibles, setEmpaqueEtiquetasLegibles] = useState(true)
  const [empaqueEnvasesLimpios, setEmpaqueEnvasesLimpios] = useState(true)

  // Dictamen Final y Observaciones
  const [dictamenCalidad, setDictamenCalidad] = useState<number>(1) // 1=Aprobado, 2=Rechazado, 3=Condicional
  const [observaciones, setObservaciones] = useState('')

  // Adjunto Ficha Técnica
  const [fichaArchivo, setFichaArchivo] = useState<File | null>(null)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)
  const [fichaTecnicaUrl, setFichaTecnicaUrl] = useState('')

  // Modal para ver Acta Oficial / Imprimir
  const [actaSeleccionada, setActaSeleccionada] = useState<RecepcionType | null>(null)

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
          registroSenasag: registroSenasag ? registroSenasag.trim() : null,
          nombreTransportista: nombreTransportista ? nombreTransportista.trim() : null,
          numeroLote: numeroLote.trim(),
          fechaFabricacion: fechaFabricacion ? `${fechaFabricacion}T12:00:00Z` : null,
          fechaVencimiento: fechaVencimiento ? `${fechaVencimiento}T12:00:00Z` : null,
          // Preguntas oficiales OVOPLUS
          docCuentaConFacturaFichaCalidad,
          docCoincidePedido,
          transpVehiculoLimpio,
          transpMercanciaEstibada,
          empaqueEtiquetasLegibles,
          empaqueEnvasesLimpios,
          // Compatibilidad
          empaqueConforme: empaqueEtiquetasLegibles && empaqueEnvasesLimpios,
          aspectoConforme: true,
          temperatura: null,
          dictamenCalidad: Number(dictamenCalidad),
          observaciones: observaciones || null,
          fichaTecnicaUrl: finalFichaUrl || null
        })
      })

      const dictamenNombre = dictamenCalidad === 1 ? 'APROBADO (Ingresado a Inventario)' : dictamenCalidad === 2 ? 'RECHAZADO' : 'CONDICIONAL'
      setExito(`Acta Oficial de Recepción registrada con éxito con Dictamen: ${dictamenNombre}.`)

      // Reset Form
      setProductoId('')
      setAlmacenId('')
      setCantidad('')
      setProveedor('')
      setRegistroSenasag('')
      setNumeroGuia('')
      setNombreTransportista('')
      setNumeroLote('')
      setFechaFabricacion('')
      setFechaVencimiento('')
      setDocCuentaConFacturaFichaCalidad(true)
      setDocCoincidePedido(true)
      setTranspVehiculoLimpio(true)
      setTranspMercanciaEstibada(true)
      setEmpaqueEtiquetasLegibles(true)
      setEmpaqueEnvasesLimpios(true)
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
      {/* Header Banner Oficial OVOPLUS */}
      <div className="bg-[#001f51] p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-[#24428e] text-white px-2.5 py-0.5 rounded font-black text-xs tracking-wider border border-blue-400/30">
              OVOPLUS
            </span>
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
              REGISTRO OFICIAL
            </span>
            <span className="text-blue-200 text-xs">• BPM / HACCP / SENASAG</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <span>Recepción de Materia Prima</span>
          </h1>
          <p className="text-xs text-blue-200 mt-1 max-w-2xl">
            Control de calidad oficial al ingreso: verificación documental, condiciones de transporte, integridad de empaques y asignación de lote.
          </p>
        </div>

        {/* Badge Metadata Oficial */}
        <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-3 text-right text-xs shrink-0 grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-blue-200 font-medium">Código:</span>
          <span className="font-bold text-white">REG-CAL-01</span>
          <span className="text-blue-200 font-medium">Versión:</span>
          <span className="font-bold text-white">01</span>
          <span className="text-blue-200 font-medium">Fecha Emisión:</span>
          <span className="font-bold text-white">{new Date().toLocaleDateString()}</span>
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

      {/* FORMULARIO DE REGISTRO - FORMATO OFICIAL OVOPLUS */}
      <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
        
        {/* ENCABEZADO DEL FORMULARIO CON FORMATO PLANILLA */}
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-[#001f51] uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[#3755c3]">fact_check</span>
              <span>REGISTRO: RECEPCIÓN DE MATERIA PRIMA</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Complete la información según la inspección física y documental en bodega</p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-tighter">Fecha:</span>
            <input
              type="date"
              value={fechaRecepcion}
              onChange={e => setFechaRecepcion(e.target.value)}
              className="bg-transparent font-bold text-[#001f51] outline-none"
            />
          </div>
        </div>

        {/* SECCIÓN I: INFORMACIÓN DEL PRODUCTO */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="w-6 h-6 rounded-full bg-[#001f51] text-white flex items-center justify-center text-xs font-black">I</span>
            <h3 className="text-xs font-black text-[#001f51] uppercase tracking-wider">Información del Producto</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Nombre del Producto */}
            <div className="sm:col-span-2">
              <label htmlFor="producto" className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-tighter">
                Nombre del Producto / Insumo *
              </label>
              <select
                id="producto"
                value={productoId}
                onChange={e => setProductoId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-[#001f51] outline-none focus:border-[#3755c3]"
              >
                <option value="">-- Seleccionar Producto --</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>
                ))}
              </select>
            </div>

            {/* Proveedor */}
            <div>
              <label htmlFor="proveedor" className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-tighter">
                Proveedor *
              </label>
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

            {/* R.S. SENASAG */}
            <div>
              <label htmlFor="senasag" className="block text-xs font-bold text-[#3755c3] mb-1 uppercase tracking-tighter">
                R.S. SENASAG
              </label>
              <input
                id="senasag"
                type="text"
                value={registroSenasag}
                onChange={e => setRegistroSenasag(e.target.value)}
                placeholder="Ej. RS-03-01-02-12345"
                className="w-full px-3 py-2 bg-slate-50 border border-blue-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#3755c3]"
              />
            </div>

            {/* Lote */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="lote" className="text-xs font-bold text-slate-700 uppercase tracking-tighter">LOTE *</label>
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

            {/* F. ELAB */}
            <div>
              <label htmlFor="fechaFab" className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tighter">F. ELAB. (Fecha Elaboración)</label>
              <input
                id="fechaFab"
                type="date"
                value={fechaFabricacion}
                onChange={e => setFechaFabricacion(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3]"
              />
            </div>

            {/* F. VENC */}
            <div>
              <label htmlFor="fechaVenc" className="block text-xs font-bold text-amber-800 mb-1 uppercase tracking-tighter">F. VENC. (Fecha Vencimiento) *</label>
              <input
                id="fechaVenc"
                type="date"
                value={fechaVencimiento}
                onChange={e => setFechaVencimiento(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-900 outline-none focus:border-amber-500"
              />
            </div>

            {/* Cantidad */}
            <div>
              <label htmlFor="cantidad" className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-tighter">
                CANTIDAD ({productoSel?.unidadMedida ?? 'Unidades'}) *
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

            {/* Almacén */}
            <div className="sm:col-span-2">
              <label htmlFor="almacen" className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-tighter">ALMACÉN DESTINO *</label>
              <select
                id="almacen"
                value={almacenId}
                onChange={e => setAlmacenId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-[#3755c3]"
              >
                <option value="">-- Seleccionar Almacén --</option>
                {almacenes.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>

            {/* Guía o Factura */}
            <div className="sm:col-span-2">
              <label htmlFor="guia" className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-tighter">N° GUÍA DE DESPACHO / FACTURA</label>
              <input
                id="guia"
                type="text"
                value={numeroGuia}
                onChange={e => setNumeroGuia(e.target.value)}
                placeholder="Ej. F-002345 / Guía #901"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3755c3]"
              />
            </div>
          </div>
        </div>

        {/* TABLA DE PREGUNTAS: II. DOCUMENTACIÓN, III. TRANSPORTE Y VEHÍCULO, IV. EMPAQUES */}
        <div className="space-y-6 bg-slate-50/70 p-6 rounded-2xl border border-slate-200">
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center gap-2 text-xs text-[#001f51]">
            <span className="material-symbols-outlined text-base text-[#3755c3] shrink-0">info</span>
            <span className="font-medium">
              <strong>Instrucción de Calidad:</strong> Se debe marcar la casilla <strong>SI</strong> en caso de cumplimiento y <strong>NO</strong> en caso de incumplimiento.
            </span>
          </div>

          {/* SECCIÓN II: DOCUMENTACIÓN */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <span className="w-5 h-5 rounded-full bg-[#001f51] text-white flex items-center justify-center text-[11px] font-black">II</span>
              <h3 className="text-xs font-black text-[#001f51] uppercase tracking-wider">Documentación</h3>
            </div>

            <div className="space-y-2">
              {/* Pregunta 1 */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <span className="text-xs font-semibold text-slate-800">
                  ¿Cuenta con Factura, Nota de entrega, Ficha tecnica y Certificado de Calidad?
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDocCuentaConFacturaFichaCalidad(true)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all border ${
                      docCuentaConFacturaFichaCalidad
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    SI
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocCuentaConFacturaFichaCalidad(false)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all border ${
                      !docCuentaConFacturaFichaCalidad
                        ? 'bg-red-600 text-white border-red-700 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>

              {/* Pregunta 2 */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <span className="text-xs font-semibold text-slate-800">
                  ¿Coincide el pedido con lo facturado y recibido?
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDocCoincidePedido(true)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all border ${
                      docCoincidePedido
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    SI
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocCoincidePedido(false)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all border ${
                      !docCoincidePedido
                        ? 'bg-red-600 text-white border-red-700 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN III: TRANSPORTE Y VEHÍCULO */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <span className="w-5 h-5 rounded-full bg-[#001f51] text-white flex items-center justify-center text-[11px] font-black">III</span>
              <h3 className="text-xs font-black text-[#001f51] uppercase tracking-wider">Transporte y Vehículo</h3>
            </div>

            <div className="space-y-2">
              {/* Pregunta 3 */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <span className="text-xs font-semibold text-slate-800">
                  ¿Está el vehículo de transporte limpio, sin plagas ni olores extraños?
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTranspVehiculoLimpio(true)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all border ${
                      transpVehiculoLimpio
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    SI
                  </button>
                  <button
                    type="button"
                    onClick={() => setTranspVehiculoLimpio(false)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all border ${
                      !transpVehiculoLimpio
                        ? 'bg-red-600 text-white border-red-700 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>

              {/* Pregunta 4 */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <span className="text-xs font-semibold text-slate-800">
                  ¿Está la mercancía bien estibada y protegida (no en contacto con el suelo)?
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTranspMercanciaEstibada(true)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all border ${
                      transpMercanciaEstibada
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    SI
                  </button>
                  <button
                    type="button"
                    onClick={() => setTranspMercanciaEstibada(false)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all border ${
                      !transpMercanciaEstibada
                        ? 'bg-red-600 text-white border-red-700 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN IV: EMPAQUES */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <span className="w-5 h-5 rounded-full bg-[#001f51] text-white flex items-center justify-center text-[11px] font-black">IV</span>
              <h3 className="text-xs font-black text-[#001f51] uppercase tracking-wider">Empaques</h3>
            </div>

            <div className="space-y-2">
              {/* Pregunta 5 */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <span className="text-xs font-semibold text-slate-800">
                  ¿Etiquetas legibles, intactas y con información clara (nombre, lote, fecha de caducidad/consumo preferente, cantidad)?
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEmpaqueEtiquetasLegibles(true)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all border ${
                      empaqueEtiquetasLegibles
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    SI
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmpaqueEtiquetasLegibles(false)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all border ${
                      !empaqueEtiquetasLegibles
                        ? 'bg-red-600 text-white border-red-700 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>

              {/* Pregunta 6 */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <span className="text-xs font-semibold text-slate-800">
                  ¿Envases/Embalajes limpios, secos e intactos (sin roturas, abolladuras)?
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEmpaqueEnvasesLimpios(true)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all border ${
                      empaqueEnvasesLimpios
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    SI
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmpaqueEnvasesLimpios(false)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all border ${
                      !empaqueEnvasesLimpios
                        ? 'bg-red-600 text-white border-red-700 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN V: RESPONSABLES Y FIRMAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                ENC. ALMACÉN OVOPLUS SRL
              </label>
              <div className="text-xs font-bold text-[#001f51] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-[#3755c3]">badge</span>
                <span>{sesion?.nombre || 'Encargado de Bodega'} ({sesion?.rol || 'Almacén'})</span>
              </div>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
              <label htmlFor="transp" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                TRANSPORTISTA - PROVEEDOR
              </label>
              <input
                id="transp"
                type="text"
                value={nombreTransportista}
                onChange={e => setNombreTransportista(e.target.value)}
                placeholder="Nombre del conductor / transportista..."
                className="w-full text-xs font-semibold text-slate-700 outline-none border-b border-dashed border-slate-300 pb-0.5 focus:border-[#3755c3]"
              />
            </div>
          </div>
        </div>

        {/* DICTAMEN FINAL, ADJUNTO Y OBSERVACIONES */}
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
              * Nota: Si el dictamen es <strong>APROBADO</strong>, el lote ingresará automáticamente al inventario disponible.
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
              <span className="text-[11px] text-blue-600 font-bold block mt-1 animate-pulse">Subiendo documento a Nube Supabase S3...</span>
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
            <span>Registrar Acta Oficial de Recepción</span>
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
                <th className="p-4">PROVEEDOR / SENASAG</th>
                <th className="p-4 text-center">CHECKLIST (6)</th>
                <th className="p-4 text-center">DICTAMEN</th>
                <th className="p-4 text-center">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recepciones.length > 0 ? (
                recepciones.map(r => {
                  const checkCount = [
                    r.docCuentaConFacturaFichaCalidad,
                    r.docCoincidePedido,
                    r.transpVehiculoLimpio,
                    r.transpMercanciaEstibada,
                    r.empaqueEtiquetasLegibles,
                    r.empaqueEnvasesLimpios
                  ].filter(Boolean).length

                  return (
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
                        <div>{r.proveedor}</div>
                        {r.registroSenasag && (
                          <div className="text-[10px] text-[#3755c3] font-bold">SENASAG: {r.registroSenasag}</div>
                        )}
                        {r.numeroGuiaFactura && (
                          <div className="text-[10px] text-slate-400 font-normal">Doc: {r.numeroGuiaFactura}</div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          checkCount === 6 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {checkCount}/6 Conformes
                        </span>
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
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActaSeleccionada(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-[#001f51] text-slate-700 hover:text-white rounded text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                            title="Ver Acta Oficial"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            <span>Ver Acta</span>
                          </button>

                          {r.fichaTecnicaUrl && (
                            <a
                              href={r.fichaTecnicaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-[#3755c3] hover:bg-blue-100 rounded text-[11px] font-bold border border-blue-200 transition-colors"
                              title="Ver Adjunto"
                            >
                              <span className="material-symbols-outlined text-sm">attach_file</span>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
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

      {/* MODAL / VISUALIZADOR DE ACTA OFICIAL OVOPLUS IMPRIMIBLE */}
      {actaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Header Formato Físico */}
            <div className="border border-slate-900 p-4 rounded-lg bg-white space-y-3">
              <div className="grid grid-cols-12 border-b border-slate-900 pb-3 items-center">
                <div className="col-span-3 font-black text-lg tracking-wider text-[#001f51] flex items-center gap-1">
                  <span className="px-2 py-1 bg-[#001f51] text-white rounded text-xs">OVOPLUS</span>
                </div>
                <div className="col-span-6 text-center">
                  <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">REGISTRO</div>
                  <div className="text-xs font-black text-slate-900 uppercase">RECEPCIÓN DE MATERIA PRIMA</div>
                </div>
                <div className="col-span-3 text-[9px] border-l border-slate-900 pl-2 text-slate-600 space-y-0.5">
                  <div><strong>Código:</strong> REG-CAL-01</div>
                  <div><strong>Versión:</strong> 01</div>
                  <div><strong>Páginas:</strong> 1 de 1</div>
                </div>
              </div>

              <div className="text-xs font-bold text-slate-800">
                <span>Fecha de Registro: </span>
                <span className="font-normal underline">{new Date(actaSeleccionada.fechaRecepcion).toLocaleDateString()}</span>
              </div>

              {/* I. Información del Producto */}
              <div className="space-y-1.5 text-xs">
                <div className="font-bold text-slate-900 border-b border-slate-300 pb-0.5">I. Información del Producto</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <div><strong className="text-slate-500">Nombre del Producto:</strong> {actaSeleccionada.producto.nombre}</div>
                  <div><strong className="text-slate-500">Proveedor:</strong> {actaSeleccionada.proveedor}</div>
                  <div><strong className="text-slate-500">R.S. SENASAG:</strong> {actaSeleccionada.registroSenasag || '—'}</div>
                  <div><strong className="text-slate-500">LOTE:</strong> <span className="font-mono font-bold">{actaSeleccionada.numeroLote}</span></div>
                  <div><strong className="text-slate-500">F. ELAB.:</strong> {actaSeleccionada.fechaFabricacion || '—'}</div>
                  <div><strong className="text-slate-500">F. VENC.:</strong> {actaSeleccionada.fechaVencimiento || '—'}</div>
                  <div><strong className="text-slate-500">CANTIDAD:</strong> {actaSeleccionada.cantidadRecibida} {actaSeleccionada.producto.unidadMedida}</div>
                  <div><strong className="text-slate-500">ALMACÉN:</strong> {actaSeleccionada.almacen.nombre}</div>
                </div>
              </div>

              {/* II. Documentación */}
              <div className="space-y-1 text-xs pt-1">
                <div className="font-bold text-slate-900 border-b border-slate-300 pb-0.5">II. Documentación</div>
                <table className="w-full text-[10px] border-collapse border border-slate-300">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5">¿Cuenta con Factura, Nota de entrega, Ficha tecnica y Certificado de Calidad?</td>
                      <td className="p-1.5 text-center font-bold w-12 border-l border-slate-200">
                        {actaSeleccionada.docCuentaConFacturaFichaCalidad ? '☑ SI' : '☐ SI'}
                      </td>
                      <td className="p-1.5 text-center font-bold w-12 border-l border-slate-200">
                        {!actaSeleccionada.docCuentaConFacturaFichaCalidad ? '☑ NO' : '☐ NO'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1.5">¿Coincide el pedido con lo facturado y recibido?</td>
                      <td className="p-1.5 text-center font-bold w-12 border-l border-slate-200">
                        {actaSeleccionada.docCoincidePedido ? '☑ SI' : '☐ SI'}
                      </td>
                      <td className="p-1.5 text-center font-bold w-12 border-l border-slate-200">
                        {!actaSeleccionada.docCoincidePedido ? '☑ NO' : '☐ NO'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* III. Transporte y Vehiculo */}
              <div className="space-y-1 text-xs pt-1">
                <div className="font-bold text-slate-900 border-b border-slate-300 pb-0.5">III. Transporte y Vehiculo</div>
                <table className="w-full text-[10px] border-collapse border border-slate-300">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5">¿Está el vehículo de transporte limpio, sin plagas ni olores extraños?</td>
                      <td className="p-1.5 text-center font-bold w-12 border-l border-slate-200">
                        {actaSeleccionada.transpVehiculoLimpio ? '☑ SI' : '☐ SI'}
                      </td>
                      <td className="p-1.5 text-center font-bold w-12 border-l border-slate-200">
                        {!actaSeleccionada.transpVehiculoLimpio ? '☑ NO' : '☐ NO'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1.5">¿Está la mercancía bien estibada y protegida (no en contacto con el suelo)?</td>
                      <td className="p-1.5 text-center font-bold w-12 border-l border-slate-200">
                        {actaSeleccionada.transpMercanciaEstibada ? '☑ SI' : '☐ SI'}
                      </td>
                      <td className="p-1.5 text-center font-bold w-12 border-l border-slate-200">
                        {!actaSeleccionada.transpMercanciaEstibada ? '☑ NO' : '☐ NO'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* IV. EMPAQUES */}
              <div className="space-y-1 text-xs pt-1">
                <div className="font-bold text-slate-900 border-b border-slate-300 pb-0.5">IV. EMPAQUES</div>
                <table className="w-full text-[10px] border-collapse border border-slate-300">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5">¿Etiquetas legibles, intactas y con información clara (nombre, lote, fecha de caducidad/consumo preferente, cantidad)?</td>
                      <td className="p-1.5 text-center font-bold w-12 border-l border-slate-200">
                        {actaSeleccionada.empaqueEtiquetasLegibles ? '☑ SI' : '☐ SI'}
                      </td>
                      <td className="p-1.5 text-center font-bold w-12 border-l border-slate-200">
                        {!actaSeleccionada.empaqueEtiquetasLegibles ? '☑ NO' : '☐ NO'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1.5">¿Envases/Embalajes limpios, secos e intactos (sin roturas, abolladuras)?</td>
                      <td className="p-1.5 text-center font-bold w-12 border-l border-slate-200">
                        {actaSeleccionada.empaqueEnvasesLimpios ? '☑ SI' : '☐ SI'}
                      </td>
                      <td className="p-1.5 text-center font-bold w-12 border-l border-slate-200">
                        {!actaSeleccionada.empaqueEnvasesLimpios ? '☑ NO' : '☐ NO'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Dictamen & Observaciones */}
              <div className="pt-2 border-t border-slate-300 text-xs">
                <div className="flex items-center gap-2">
                  <strong className="text-slate-800">DICTAMEN FINAL:</strong>
                  <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                    actaSeleccionada.dictamenNum === 1 ? 'bg-emerald-100 text-emerald-900' : actaSeleccionada.dictamenNum === 2 ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {actaSeleccionada.dictamenCalidad}
                  </span>
                </div>
                {actaSeleccionada.observaciones && (
                  <div className="mt-1 text-[11px] text-slate-600">
                    <strong>Observaciones:</strong> {actaSeleccionada.observaciones}
                  </div>
                )}
              </div>

              {/* Firmas */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[10px]">
                <div className="border-t border-slate-800 pt-1 font-bold text-slate-800">
                  Enc. Almacen OVOPLUS SRL<br />
                  <span className="font-normal text-slate-500">({actaSeleccionada.usuario})</span>
                </div>
                <div className="border-t border-slate-800 pt-1 font-bold text-slate-800">
                  Transportista-PROVEEDOR<br />
                  <span className="font-normal text-slate-500">({actaSeleccionada.nombreTransportista || 'Conductor'})</span>
                </div>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setActaSeleccionada(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#001f51] hover:bg-[#00337c] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-base">print</span>
                <span>Imprimir Acta Oficial</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
