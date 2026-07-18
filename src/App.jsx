import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/layout/AppLayout'
import LoginPage from '@/pages/Login'
import DashboardPage from '@/pages/Dashboard'
import CustomersPage from '@/pages/Customers'
import ProductsPage from '@/pages/Products'
import ProformasPage from '@/pages/Proformas'
import ProformaFormPage from '@/pages/ProformaForm'
import ProformaDetailPage from '@/pages/ProformaDetail'
import ApprovalsPage from '@/pages/Approvals'
import ReportsPage from '@/pages/Reports'
import UsersPage from '@/pages/Users'
import SettingsPage from '@/pages/Settings'

function RequireAuth() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

function RequireRole({ roles }) {
  const { role } = useAuth()
  if (!roles.includes(role)) return <Navigate to="/" replace />
  return <Outlet />
}

export default function App() {
  const { isAuthenticated } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/proformas" element={<ProformasPage />} />
        <Route path="/proformas/:id" element={<ProformaDetailPage />} />
        <Route element={<RequireRole roles={['sales', 'admin']} />}>
          <Route path="/proformas/new" element={<ProformaFormPage />} />
          <Route path="/proformas/:id/edit" element={<ProformaFormPage />} />
        </Route>
        <Route element={<RequireRole roles={['supervisor', 'admin']} />}>
          <Route path="/approvals" element={<ApprovalsPage />} />
        </Route>
        <Route element={<RequireRole roles={['admin']} />}>
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
