import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, X, Inbox } from 'lucide-react'
import { api } from '@/lib/api'
import { useList, useApiMutation } from '@/hooks/useCrud'
import { formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

export default function StepRequestsPage() {
  const navigate = useNavigate()
  const [rejecting, setRejecting] = useState(null)
  const [note, setNote] = useState('')

  const { data, isLoading, isError, refetch } = useList('step-requests', '/orders/requests')
  const requests = data?.requests || []

  const decide = useApiMutation({
    mutationFn: ({ id, decision, note }) =>
      api.post(`/orders/requests/${id}/decision`, { decision, note }),
    invalidate: ['step-requests', 'step-request-count', 'orders', 'order'],
    successMessage: 'Request decided',
    onSuccess: () => { setRejecting(null); setNote('') },
  })

  return (
    <div>
      <PageHeader
        title="Step requests"
        description="Stage moves requested by the factory. Approve to move the order, or decline."
      />

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : isError ? (
        <Card><ErrorState onRetry={refetch} /></Card>
      ) : requests.length === 0 ? (
        <Card><EmptyState icon={Inbox} title="No pending requests" description="Requests from the factory show up here." /></Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <button
                    className="font-semibold text-primary hover:underline cursor-pointer"
                    onClick={() => navigate(`/orders/${r.proformaId}`)}
                  >
                    {r.proformaNumber}
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary">{r.fromStepName || 'Not started'}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="warning">{r.toStepName}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requested by {r.requestedBy?.name || 'factory'} · {formatDate(r.createdAt)}
                  </p>
                  {r.reason && (
                    <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <span className="font-semibold">Reason (moving back): </span>{r.reason}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    loading={decide.isPending && decide.variables?.id === r.id && decide.variables?.decision === 'approve'}
                    onClick={() => decide.mutate({ id: r.id, decision: 'approve' })}
                  >
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setRejecting(r)}>
                    <X className="h-4 w-4" /> Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Decline this move?</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Note to the factory (optional)</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why it's being declined" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
          <Button
            variant="destructive"
            loading={decide.isPending}
            onClick={() => decide.mutate({ id: rejecting.id, decision: 'reject', note })}
          >
            Decline
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
