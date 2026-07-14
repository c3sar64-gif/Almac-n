import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Movimientos from './Movimientos'

const productos = [{ id: 1, sku: 'P-001', nombre: 'Tornillo', unidadMedida: 'pieza', activo: true }]
const almacenes = [
  { id: 1, nombre: 'Central', activo: true },
  { id: 2, nombre: 'Sucursal', activo: true },
]

describe('Movimientos', () => {
  beforeEach(() => {
    localStorage.setItem('almacen.sesion', JSON.stringify({ token: 't', nombre: 'Op', rol: 'Operador' }))
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (String(url).startsWith('/api/productos'))
        return Promise.resolve(new Response(JSON.stringify(productos), { status: 200 }))
      if (String(url).startsWith('/api/almacenes'))
        return Promise.resolve(new Response(JSON.stringify(almacenes), { status: 200 }))
      return Promise.resolve(new Response('{}', { status: 200 }))
    }))
  })

  it('rechaza transferencia con mismo origen y destino sin llamar a la API', async () => {
    render(<Movimientos />)
    await screen.findByText('Tornillo', { exact: false })

    await userEvent.selectOptions(screen.getByLabelText(/tipo/i), 'transferencia')
    await userEvent.selectOptions(screen.getByLabelText(/producto/i), '1')
    await userEvent.selectOptions(screen.getByLabelText(/origen/i), '1')
    await userEvent.selectOptions(screen.getByLabelText(/destino/i), '1')
    await userEvent.type(screen.getByLabelText(/cantidad/i), '5')
    await userEvent.click(screen.getByRole('button', { name: /registrar/i }))

    expect(await screen.findByText(/origen y destino/i)).toBeInTheDocument()
    const llamadasPost = (fetch as ReturnType<typeof vi.fn>).mock.calls
      .filter(c => c[1]?.method === 'POST')
    expect(llamadasPost).toHaveLength(0)
  })
})
