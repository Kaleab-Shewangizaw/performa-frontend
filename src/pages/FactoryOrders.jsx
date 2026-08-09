import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Factory, PackageCheck, ArrowRight, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { useList, useApiMutation } from '@/hooks/useCrud'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

function formatWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? '' : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function AdvanceDialog({ order, steps, onClose }) {
  const current = order.currentStep
  // Default the selection to the next step in the pipeline, if there is one.
  const defaultStepId = useMemo(() => {
    const idx = steps.findIndex((s) => s.id === current?.id)
    if (idx === -1) return steps[0]?.id
    return steps[Math.min(idx + 1, steps.length - 1)]?.id
  }, [steps, current])

  const [stepId, setStepId] = useState(defaultStepId)
  const [note, setNote] = useState('')

  const { data: timeline, isLoading: loadingTimeline } = useQuery({
    queryKey: ['order-timeline', order.id],
    queryFn: () => api.get(`/orders/${order.id}/timeline`).then((r) => r.data.timeline),
  })

  const advance = useApiMutation({
    mutationFn: () => api.post(`/orders/${order.id}/step`, { stepId: Number(stepId), note: note.trim() }),
    invalidate: ['orders', 'order-timeline'],
    successMessage: 'Status updated',
    onSuccess: onClose,
  })

  return (
    <Dialog open onClose={onClose} className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Order {order.proformaNumber}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Current stage</span>
          <Badge variant="warning">{current?.name || 'Not started'}</Badge>
        </div>

        <div className="space-y-1.5">
          <Label>Move to</Label>
          <Select value={stepId} onChange={(e) => setStepId(e.target.value)}>
            {steps.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Note (optional)</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything worth recording about this stage" />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">History</p>
          {loadingTimeline ? (
            <Skeleton className="h-16 w-full" />
          ) : timeline?.length ? (
            <ol className="space-y-2">
              {timeline.map((h) => (
                <li key={h.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{h.stepName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatWhen(h.createdAt)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => advance.mutate()} loading={advance.isPending} disabled={!stepId}>
          Update status
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

export default function FactoryOrdersPage() {
  const [page, setPage] = useState(1)
  const [advancing, setAdvancing] = useState(null)

  const { data, isLoading, isError, refetch } = useList('orders', '/orders', { page })
  const { data: stepData } = useList('order-steps', '/order-steps', { activeOnly: 'true' })

  const orders = data?.orders || []
  const steps = stepData?.steps || []

  return (
    <div>
      <PageHeader
        title="Production"
        description="Approved orders on the factory floor. Update each one as it moves through the workshop."
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : isError ? (
        <Card><ErrorState onRetry={refetch} /></Card>
      ) : orders.length === 0 ? (
        <Card>
          <EmptyState icon={Factory} title="No orders in production" description="Approved orders will appear here." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold tracking-tight">{o.proformaNumber}</div>
                    {o.projectName && <div className="truncate text-sm text-muted-foreground">{o.projectName}</div>}
                  </div>
                  <Badge variant="warning" className="shrink-0">
                    {o.currentStep?.name || 'Not started'}
                  </Badge>
                </div>

                <dl className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Customer</dt>
                    <dd className="truncate text-right font-medium">{o.customer?.fullName || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Items</dt>
                    <dd className="text-right font-medium">{o.items?.length ?? 0}</dd>
                  </div>
                </dl>

                <Button className="mt-4 w-full" variant="outline" onClick={() => setAdvancing(o)}>
                  <ArrowRight className="h-4 w-4" /> Update status
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Pagination pagination={data?.pagination} onPageChange={setPage} />
      </div>

      {advancing && (
        <AdvanceDialog order={advancing} steps={steps} onClose={() => setAdvancing(null)} />
      )}
    </div>
  )
}
