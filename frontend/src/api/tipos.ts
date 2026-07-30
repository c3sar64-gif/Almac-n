export interface Producto {
  id: number
  sku: string
  nombre: string
  descripcion?: string | null
  categoria?: string | null
  unidadMedida: string
  activo: boolean
  imagenUrl?: string | null
  precioUnitario?: number | null
}

export interface Almacen {
  id: number
  nombre: string
  ubicacion?: string | null
  activo: boolean
}

export interface Existencia {
  id: number
  cantidad: number
  stockMinimo: number
  bajoMinimo: boolean
  producto: { id: number; sku: string; nombre: string; unidadMedida: string; categoria?: string | null; imagenUrl?: string | null; precioUnitario?: number | null }
  almacen: { id: number; nombre: string }
}

export interface Movimiento {
  id: number
  tipo: 'Entrada' | 'Salida' | 'Transferencia'
  fecha: string
  cantidad: number
  nota?: string | null
  numeroLote?: string | null
  fechaVencimiento?: string | null
  precioUnitario?: number | null
  producto: { id: number; sku: string; nombre: string }
  almacenOrigen?: string | null
  almacenDestino?: string | null
  usuario: string
}

export interface AlertaStock {
  productoId: number
  productoNombre: string
  sku: string
  unidadMedida: string
  almacenNombre: string
  stockActual: number
  stockMinimo: number
}

export interface AlertaVencimiento {
  loteId: number
  codigoLote: string
  productoNombre: string
  almacenNombre: string
  cantidad: number
  fechaVencimiento: string
  diasParaVencer: number
  esVencido: boolean
}

export interface ResumenNotificaciones {
  totalAlertas: number
  alertasStock: AlertaStock[]
  alertasVencimiento: AlertaVencimiento[]
  tareasPendientes: number
}

export interface Sesion {
  token: string
  nombre: string
  rol: 'Admin' | 'Chofer' | 'Almacenero' | 'Encargado' | string
  modulosPermitidos?: string
}

export interface UsuarioLista {
  id: number
  email: string
  nombre: string
  rol: string
  activo: boolean
  modulosPermitidos?: string
}

export interface TareaLogistica {
  id: number
  titulo: string
  descripcion?: string | null
  choferId: number
  chofer?: { id: number; nombre: string; email: string } | null
  almacenOrigenId?: number | null
  almacenOrigen?: string | null
  almacenDestinoId?: number | null
  almacenDestino?: string | null
  estado: 'Pendiente' | 'EnRuta' | 'Completada' | 'Cancelada'
  estadoNum: number
  fechaAsignacion: string
  fechaProgramada: string
  horaInicio: string
  horaFin: string
  fechaCompletado?: string | null
  notasChofer?: string | null
  comprobanteUrl?: string | null
}

export interface ResumenDashboard {
  kpis: {
    totalProductos: number
    totalAlmacenes: number
    alertasStockCount: number
    alertasVencimientoCount: number
    tareasPendientesCount: number
    movimientosMesCount: number
  }
  entradasVsSalidas: Array<{
    fecha: string
    entradas: number
    salidas: number
  }>
  topInsumos: Array<{
    productoNombre: string
    unidadMedida: string
    totalSalidas: number
  }>
  distribucionAlmacenes: Array<{
    almacenNombre: string
    totalStock: number
  }>
  estadoLogistica: {
    pendientes: number
    enTransito: number
    entregadas: number
    total: number
  }
  ultimosMovimientos: Array<{
    id: number
    fecha: string
    tipo: string
    productoNombre: string
    sku: string
    cantidad: number
    unidadMedida: string
    almacenOrigen: string | null
    almacenDestino: string | null
    usuario: string
  }>
}

export interface RecepcionMateriaPrima {
  id: number
  fechaRecepcion: string
  producto: { id: number; sku: string; nombre: string; unidadMedida: string }
  almacen: { id: number; nombre: string }
  cantidadRecibida: number
  proveedor: string
  numeroGuiaFactura?: string | null
  numeroLote: string
  fechaFabricacion?: string | null
  fechaVencimiento?: string | null
  empaqueConforme: boolean
  aspectoConforme: boolean
  temperatura?: string | null
  dictamenCalidad: string
  dictamenNum: number // 1 = Aprobado, 2 = Rechazado, 3 = Condicional
  observaciones?: string | null
  fichaTecnicaUrl?: string | null
  usuario: string
}
