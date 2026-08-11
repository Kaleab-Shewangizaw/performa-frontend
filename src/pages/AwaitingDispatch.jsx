import { useNavigate } from 'react-router-dom'
import { Factory, Send, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useList, useApiMutation } from '@/hooks/useCrud'
import { formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { TableSkeleton } from '@/components/ui/skeleton'

// Approved proformas that haven't been handed to the factory yet — the ones an
// admin might otherwise forget to dispatch.
export default function AwaitingDispatchPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useList('awaiting-dispatch', '/proformas', {
    status: 'approved',
    sent: 'false',
    limit: 100,
  })
  const proformas = data?.proformas || []

  const send = useApiMutation({
    mutationFn: (id) => api.post(`/proformas/${id}/send-to-factory`),
    invalidate: ['awaiting-dispatch', 'proformas', 'orders', 'step-request-count'],
    successMessage: 'Sent to the factory',
  })

  return (
    <div>
      <PageHeader
        title="Awaiting dispatch"
        description="Approved orders that haven't been sent to the factory yet."
      />

      <Card>
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : proformas.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All caught up" description="Every approved order has been sent to the factory." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Project</TableHead>
                <TableHead className="hidden sm:table-cell">Approved</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proformas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell
                    className="cursor-pointer font-medium text-primary"
                    onClick={() => navigate(`/proformas/${p.id}`)}
                  >
                    {p.proformaNumber}
                  </TableCell>
                  <TableCell>{p.customer?.fullName}</TableCell>
                  <TableCell className="hidden md:table-cell">{p.projectName || '—'}</TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(p.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      loading={send.isPending && send.variables === p.id}
                      onClick={() => send.mutate(p.id)}
                    >
                      <Send className="h-4 w-4" /> Send to factory
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
