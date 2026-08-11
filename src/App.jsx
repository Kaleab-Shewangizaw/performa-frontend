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
import FactoryOrderDetailPage from '@/pages/FactoryOrderDetail'
import FactoryOrderPrintPage from '@/pages/FactoryOrderPrint'
import FactoryDashboardPage from '@/pages/FactoryDashboard'
import AwaitingDispatchPage from '@/pages/AwaitingDispatch'
import StepRequestsPage from '@/pages/StepRequests'
import ActivityLogPage from '@/pages/ActivityLog'

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
      {/* Printable work order — authed, but rendered outside the app chrome. */}
      <Route
        path="/orders/:id/print"
        element={isAuthenticated ? <FactoryOrderPrintPage /> : <Navigate to="/login" replace />}
      />
      <Route element={<RequireAuth />}>
        {/* Factory workers get their own dashboard as the landing page. */}
        <Route path="/" element={role === 'factory' ? <FactoryDashboardPage /> : <DashboardPage />} />
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
          <Route path="/awaiting-dispatch" element={<AwaitingDispatchPage />} />
          <Route path="/step-requests" element={<StepRequestsPage />} />
        </Route>
        <Route element={<RequireRole roles={['factory', 'supervisor', 'admin']} />}>
          <Route path="/orders" element={<FactoryOrdersPage />} />
          <Route path="/orders/:id" element={<FactoryOrderDetailPage />} />
        </Route>
        <Route element={<RequireRole roles={['admin']} />}>
          <Route path="/order-steps" element={<OrderStepsPage />} />
          <Route path="/activity" element={<ActivityLogPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
