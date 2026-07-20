export interface Producto {
  id: number
  sku: string
  nombre: string
  descripcion?: string | null
  categoria?: string | null
  unidadMedida: string
  activo: boolean
  imagenUrl?: string | null
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
  producto: { id: number; sku: string; nombre: string; unidadMedida: string; categoria?: string | null; imagenUrl?: string | null }
  almacen: { id: number; nombre: string }
}

export interface Movimiento {
  id: number
  tipo: 'Entrada' | 'Salida' | 'Transferencia'
  fecha: string
  cantidad: number
  nota?: string | null
  producto: { id: number; sku: string; nombre: string }
  almacenOrigen?: string | null
  almacenDestino?: string | null
  usuario: string
}

export interface Sesion {
  token: string
  nombre: string
  rol: 'Admin' | 'Chofer' | 'Almacenero' | 'Encargado' | string
}

export interface UsuarioLista {
  id: number
  email: string
  nombre: string
  rol: string
  activo: boolean
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
  fechaCompletado?: string | null
  notasChofer?: string | null
}
