import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/layout/AppLayout'
import LoginPage from '@/pages/Login'
import TrackOrderPage from '@/pages/TrackOrder'
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
import OrderStepsPage from '@/pages/OrderSteps'
import FactoryOrdersPage from '@/pages/FactoryOrders'

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
  const { isAuthenticated, role } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      {/* Public — the customer order-tracking page (its own subdomain). No auth. */}
      <Route path="/track" element={<TrackOrderPage />} />
      <Route element={<RequireAuth />}>
        {/* Factory workers have no admin dashboard — send them to their queue. */}
        <Route path="/" element={role === 'factory' ? <Navigate to="/orders" replace /> : <DashboardPage />} />
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
        <Route element={<RequireRole roles={['factory', 'admin']} />}>
          <Route path="/orders" element={<FactoryOrdersPage />} />
        </Route>
        <Route element={<RequireRole roles={['admin']} />}>
          <Route path="/order-steps" element={<OrderStepsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
