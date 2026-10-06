import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import CapaList from './pages/CapaList'
import CapaDetail from './pages/CapaDetail'
import RaiseRequest from './pages/RaiseRequest'
import InspectionConfig from './pages/InspectionConfig'
import Projects from './pages/Projects'

// Wraps pages that need login (and optionally a specific role)
function Protected({ roles, children }) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" />
  if (roles && !roles.includes(user.role)) return <Navigate to="/capa" />

  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <p className="center">Loading...</p>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/capa" /> : <Login />} />

      {/* Every page inside here gets the sidebar (Layout) */}
      <Route element={<Protected><Layout /></Protected>}>
        {/* Same component, different "key" so React starts each page with fresh state (filters) */}
        <Route path="/inspections" element={<CapaList key="all" scope="all" />} />
        <Route path="/capa" element={<CapaList key="mine" scope="mine" />} />
        <Route path="/capa/:id" element={<CapaDetail />} />
        <Route path="/capa/new" element={<Protected roles={['supervisor']}><RaiseRequest /></Protected>} />
        <Route path="/config" element={<Protected roles={['admin']}><InspectionConfig /></Protected>} />
        <Route path="/projects" element={<Protected roles={['admin']}><Projects /></Protected>} />
      </Route>

      {/* Any unknown URL -> CAPA list */}
      <Route path="*" element={<Navigate to="/capa" />} />
    </Routes>
  )
}
