import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckSquare } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useList, useSettings } from '@/hooks/useCrud'
import { formatMoney, formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { TableSkeleton } from '@/components/ui/skeleton'

export default function ApprovalsPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  // Supervisors review "pending"; admins review "supervisor_approved" by default
  const [queue, setQueue] = useState(isAdmin ? 'supervisor_approved' : 'pending')

  const { data: settings } = useSettings()
  const { data, isLoading, isError, refetch } = useList('proformas', '/proformas', {
    status: queue, page, sort: 'createdAt',
  })

  const proformas = data?.proformas || []
  const currency = settings?.currency || 'ETB'

  return (
    <div>
      <PageHeader
        title="Approvals"
        description={isAdmin ? 'Review proformas awaiting final approval' : 'Review proformas submitted by sales'}
      >
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant={queue === 'supervisor_approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setQueue('supervisor_approved'); setPage(1) }}
            >
              Awaiting final approval
            </Button>
            <Button
              variant={queue === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setQueue('pending'); setPage(1) }}
            >
              Pending supervisor
            </Button>
          </div>
        )}
      </PageHeader>

      <Card>
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : proformas.length === 0 ? (
          <EmptyState icon={CheckSquare} title="Queue is empty" description="Nothing waiting for review right now." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Sales Person</TableHead>
                <TableHead className="hidden md:table-cell">Submitted</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {proformas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.proformaNumber}</TableCell>
                  <TableCell>{p.customer?.fullName}</TableCell>
                  <TableCell className="hidden md:table-cell">{p.salesPerson?.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatDate(p.createdAt)}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(p.grandTotal, currency)}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => navigate(`/proformas/${p.id}`)}>
                      Review
                    </Button>
                  </TableCell>
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
