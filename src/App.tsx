import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import { RotaProtegida } from './components/RotaProtegida'
import Cardapio from './pages/Cardapio'
import Login from './pages/Login'
import Cozinha from './pages/Cozinha'
import Admin from './pages/Admin'
import AdminVincularSetores from './pages/AdminVincularSetores'
import AdminHorarios from './pages/AdminHorarios'
import AdminReembolsos from './pages/AdminReembolsos'
import Disponibilidade from './pages/Disponibilidade'
import Checkout from './pages/Checkout'
import SemAcesso from './pages/SemAcesso'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Cardapio />} />
          <Route path="/checkout/:pedidoId" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/sem-acesso" element={<SemAcesso />} />

          <Route
            path="/cozinha"
            element={
              <RotaProtegida papeisPermitidos={['cozinha', 'admin']}>
                <Cozinha />
              </RotaProtegida>
            }
          />

          <Route
            path="/admin"
            element={
              <RotaProtegida papeisPermitidos={['admin']}>
                <Admin />
              </RotaProtegida>
            }
          />

          <Route
            path="/disponibilidade"
            element={
              <RotaProtegida papeisPermitidos={['cozinha', 'admin']}>
                <Disponibilidade />
              </RotaProtegida>
            }
          />

          <Route
            path="/admin/setores"
            element={
              <RotaProtegida papeisPermitidos={['admin']}>
                <AdminVincularSetores />
              </RotaProtegida>
            }
          />

          <Route
            path="/admin/horarios"
            element={
              <RotaProtegida papeisPermitidos={['admin']}>
                <AdminHorarios />
              </RotaProtegida>
            }
          />

          <Route
            path="/admin/reembolsos"
            element={
              <RotaProtegida papeisPermitidos={['admin']}>
                <AdminReembolsos />
              </RotaProtegida>
            }
          />

          <Route path="*" element={<Cardapio />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
