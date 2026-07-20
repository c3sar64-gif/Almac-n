import { Route, Routes } from 'react-router-dom'
import Layout from './componentes/Layout'
import RutaProtegida from './componentes/RutaProtegida'
import Login from './paginas/Login'
import Existencias from './paginas/Existencias'
import Productos from './paginas/Productos'
import Almacenes from './paginas/Almacenes'
import Movimientos from './paginas/Movimientos'
import Reportes from './paginas/Reportes'
import Usuarios from './paginas/Usuarios'
import LogisticaChoferes from './paginas/LogisticaChoferes'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Existencias />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/almacenes" element={<Almacenes />} />
          <Route path="/movimientos" element={<Movimientos />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/logistica-choferes" element={<LogisticaChoferes />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Route>
      </Route>
    </Routes>
  )
}
