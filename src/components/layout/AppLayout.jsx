import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users as UsersIcon, Package, FileText, CheckSquare,
  BarChart3, Settings, UserCog, LogOut, Menu, X, Mountain,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useBranding } from '@/hooks/useCrud'
import { cn, ROLE_LABELS } from '@/lib/utils'
import { NotificationBell } from './NotificationBell'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['sales', 'supervisor', 'admin'] },
  { to: '/customers', label: 'Customers', icon: UsersIcon, roles: ['sales', 'supervisor', 'admin'] },
  { to: '/products', label: 'Products', icon: Package, roles: ['sales', 'supervisor', 'admin'] },
  { to: '/proformas', label: 'Proformas', icon: FileText, roles: ['sales', 'supervisor', 'admin'] },
  { to: '/approvals', label: 'Approvals', icon: CheckSquare, roles: ['supervisor', 'admin'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin'] },
  { to: '/users', label: 'Users', icon: UserCog, roles: ['admin'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
]

function SidebarContent({ onNavigate }) {
  const { user, role } = useAuth()
  const { data: branding } = useBranding()
  const items = NAV.filter((item) => item.roles.includes(role))
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
        {branding?.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-0.5"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <Mountain className="h-5 w-5 text-white" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-bold leading-tight text-white">
            {branding?.companyName || 'Proforma System'}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Proforma System</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-medium text-white">{user?.name}</p>
        <p className="text-xs text-slate-400">{ROLE_LABELS[role]}</p>
      </div>
    </div>
  )
}

export function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-[#152a45] lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-60 bg-[#152a45]">
            <button
              className="absolute right-3 top-4 text-slate-300 cursor-pointer"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-card px-4 shadow-sm">
          <button
            className="rounded-md p-2 hover:bg-accent lg:hidden cursor-pointer"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
