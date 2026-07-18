import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, FileText } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useList, useSettings } from '@/hooks/useCrud'
import { formatMoney, formatDate, STATUS_LABELS } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { TableSkeleton } from '@/components/ui/skeleton'

export default function ProformasPage() {
  const { isSales, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data: settings } = useSettings()
  const { data, isLoading, isError, refetch } = useList('proformas', '/proformas', {
    q, page, status: status || undefined,
  })

  const proformas = data?.proformas || []
  const currency = settings?.currency || 'ETB'

  return (
    <div>
      <PageHeader title="Proformas" description="Proforma invoices and their approval status">
        {(isSales || isAdmin) && (
          <Button onClick={() => navigate('/proformas/new')}>
            <Plus className="h-4 w-4" /> New Proforma
          </Button>
        )}
      </PageHeader>

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search proforma number..."
              className="pl-9"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1) }}
            />
          </div>
          <Select
            className="sm:w-52"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : proformas.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No proformas found"
            description="Create a proforma from the button above."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Sales Person</TableHead>
                <TableHead className="hidden md:table-cell">Issue Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proformas.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/proformas/${p.id}`)}
                >
                  <TableCell className="font-medium text-primary">
                    <Link to={`/proformas/${p.id}`} onClick={(e) => e.stopPropagation()}>
                      {p.proformaNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {p.customer?.fullName}
                    {p.customer?.companyName && (
                      <span className="block text-xs text-muted-foreground">{p.customer.companyName}</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{p.salesPerson?.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatDate(p.issueDate)}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(p.grandTotal, currency)}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pagination pagination={data?.pagination} onPageChange={setPage} />
      </Card>
    </div>
  )
}
