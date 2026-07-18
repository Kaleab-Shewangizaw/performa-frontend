import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, Users, Clock, CheckCircle2, XCircle, Banknote, FileEdit, UserCog, Plus,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/hooks/useCrud'
import { formatMoney, formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

function useDashboard(role) {
  return useQuery({
    queryKey: ['dashboard', role],
    queryFn: () => api.get(`/dashboard/${role}`).then((r) => r.data),
  })
}

function ProformaMiniTable({ proformas, currency, emptyLabel }) {
  const navigate = useNavigate()
  if (!proformas?.length) return <EmptyState icon={FileText} title={emptyLabel} />
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Number</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead className="hidden sm:table-cell">Date</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {proformas.map((p) => (
          <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/proformas/${p.id}`)}>
            <TableCell className="font-medium text-primary">{p.proformaNumber}</TableCell>
            <TableCell>{p.customer?.fullName}</TableCell>
            <TableCell className="hidden sm:table-cell">{formatDate(p.createdAt)}</TableCell>
            <TableCell className="text-right">{formatMoney(p.grandTotal, currency)}</TableCell>
            <TableCell><StatusBadge status={p.status} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-80" />
    </div>
  )
}

function SalesDashboard({ currency }) {
  const { data, isLoading, isError, refetch } = useDashboard('sales')
  const navigate = useNavigate()
  if (isLoading) return <DashboardSkeleton />
  if (isError) return <ErrorState onRetry={refetch} />
  const { stats, recentProformas, recentCustomers } = data

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Drafts" value={stats.drafts} icon={FileEdit} tone="default" />
        <StatCard label="Pending Approval" value={stats.pending} icon={Clock} tone="warning" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} tone="success"
          hint={formatMoney(stats.approvedValue, currency)} />
        <StatCard label="Rejected" value={stats.rejected} icon={XCircle} tone="destructive" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Proformas</CardTitle>
            <Button size="sm" onClick={() => navigate('/proformas/new')}>
              <Plus className="h-4 w-4" /> New
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ProformaMiniTable proformas={recentProformas} currency={currency} emptyLabel="No proformas yet" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent Customers</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recentCustomers?.length ? recentCustomers.map((c) => (
              <Link key={c.id} to="/customers" className="block rounded-md border p-3 hover:bg-accent">
                <p className="text-sm font-medium">{c.fullName}</p>
                <p className="text-xs text-muted-foreground">{c.companyName || c.phone}</p>
              </Link>
            )) : <p className="text-sm text-muted-foreground">No customers yet</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SupervisorDashboard({ currency }) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useDashboard('supervisor')
  if (isLoading) return <DashboardSkeleton />
  if (isError) return <ErrorState onRetry={refetch} />
  const { stats, pendingReviews } = data

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending Review" value={stats.pending} icon={Clock} tone="warning" />
        <StatCard label="Approved Today" value={stats.approvedToday} icon={CheckCircle2} tone="success" />
        <StatCard label="Rejected" value={stats.rejected} icon={XCircle} tone="destructive" />
        <StatCard label="Total Proformas" value={stats.total} icon={FileText} tone="info" />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Pending Reviews</CardTitle>
          <Button size="sm" variant="outline" onClick={() => navigate('/approvals')}>
            View all
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ProformaMiniTable proformas={pendingReviews} currency={currency} emptyLabel="Nothing waiting for review" />
        </CardContent>
      </Card>
    </div>
  )
}

function AdminDashboard({ currency }) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useDashboard('admin')
  if (isLoading) return <DashboardSkeleton />
  if (isError) return <ErrorState onRetry={refetch} />
  const { stats, awaitingFinal } = data

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue (approved)" value={formatMoney(stats.revenue, currency)} icon={Banknote} tone="success" />
        <StatCard label="Total Customers" value={stats.totalCustomers} icon={Users} tone="info" />
        <StatCard label="Total Proformas" value={stats.totalProformas} icon={FileText} tone="default" />
        <StatCard label="Active Users" value={stats.totalUsers} icon={UserCog} tone="default" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending" value={stats.pending} icon={Clock} tone="warning" />
        <StatCard label="Awaiting Final Approval" value={stats.supervisorApproved} icon={Clock} tone="info" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} tone="success" />
        <StatCard label="Rejected" value={stats.rejected} icon={XCircle} tone="destructive" />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Awaiting Final Approval</CardTitle>
          <Button size="sm" variant="outline" onClick={() => navigate('/approvals')}>
            Review queue
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ProformaMiniTable proformas={awaitingFinal} currency={currency} emptyLabel="No proformas awaiting final approval" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  const { user, role } = useAuth()
  const { data: settings } = useSettings()
  const currency = settings?.currency || 'ETB'

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0]}`}
        description={
          role === 'sales' ? 'Your customers and proformas at a glance'
          : role === 'supervisor' ? 'Review queue and approval statistics'
          : 'Company-wide overview'
        }
      />
      {role === 'sales' && <SalesDashboard currency={currency} />}
      {role === 'supervisor' && <SupervisorDashboard currency={currency} />}
      {role === 'admin' && <AdminDashboard currency={currency} />}
    </div>
  )
}
