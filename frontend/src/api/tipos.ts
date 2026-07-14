export interface Producto {
  id: number
  sku: string
  nombre: string
  descripcion?: string | null
  categoria?: string | null
  unidadMedida: string
  activo: boolean
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
  producto: { id: number; sku: string; nombre: string; unidadMedida: string }
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
  rol: 'Admin' | 'Operador'
}

export interface UsuarioLista {
  id: number
  email: string
  nombre: string
  rol: string
  activo: boolean
}
