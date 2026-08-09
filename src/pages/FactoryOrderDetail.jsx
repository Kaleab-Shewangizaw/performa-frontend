import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { useList, useApiMutation } from '@/hooks/useCrud'
import { formatDate } from '@/lib/utils'
import { ErrorState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

// Measurements print at their natural precision (0.868, not 0.87).
function trim(n) {
  if (n === null || n === undefined) return '—'
  return String(Number(Number(n).toFixed(4)))
}
function formatWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? '' : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function FactoryOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data.order),
  })
  const { data: timeline } = useQuery({
    queryKey: ['order-timeline', id],
    queryFn: () => api.get(`/orders/${id}/timeline`).then((r) => r.data.timeline),
  })
  const { data: stepData } = useList('order-steps', '/order-steps', { activeOnly: 'true' })
  const steps = stepData?.steps || []

  const [stepId, setStepId] = useState('')
  const [note, setNote] = useState('')

  // Default the selection to the next step in the pipeline.
  const nextStepId = useMemo(() => {
    if (!order || !steps.length) return ''
    const idx = steps.findIndex((s) => s.id === order.currentStep?.id)
    if (idx === -1) return steps[0].id
    return steps[Math.min(idx + 1, steps.length - 1)].id
  }, [order, steps])
  useEffect(() => { setStepId(nextStepId) }, [nextStepId])

  const advance = useApiMutation({
    mutationFn: () => api.post(`/orders/${id}/step`, { stepId: Number(stepId), note: note.trim() }),
    invalidate: ['orders', 'order', 'order-timeline'],
    successMessage: 'Status updated',
    onSuccess: () => setNote(''),
  })

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>
  }
  if (isError || !order) return <ErrorState onRetry={refetch} />

  const c = order.customer || {}

  return (
    <div className="w-full">
      <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate('/orders')}>
        <ArrowLeft className="h-4 w-4" /> Production queue
      </Button>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{order.proformaNumber}</h1>
          <Badge variant="warning">{order.currentStep?.name || 'Not started'}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Order</CardTitle></CardHeader>
            <CardContent className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              {order.orderNumber && <p><span className="text-muted-foreground">Order no: </span>{order.orderNumber}</p>}
              {order.materialType && <p><span className="text-muted-foreground">Material: </span>{order.materialType}</p>}
              {order.projectName && <p><span className="text-muted-foreground">Project: </span>{order.projectName}</p>}
              {order.orderedDate && <p><span className="text-muted-foreground">Ordered: </span>{formatDate(order.orderedDate)}</p>}
              {order.deliveryTime && <p><span className="text-muted-foreground">Delivery: </span>{order.deliveryTime}</p>}
              {order.totalWeight && <p><span className="text-muted-foreground">Total weight: </span>{order.totalWeight}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <p><span className="text-muted-foreground">Name: </span>{c.fullName}</p>
              {c.companyName && <p><span className="text-muted-foreground">Company: </span>{c.companyName}</p>}
              {c.phone && <p><span className="text-muted-foreground">Phone: </span>{c.phone}</p>}
              {(c.address || c.city) && (
                <p className="sm:col-span-2">
                  <span className="text-muted-foreground">Address: </span>
                  {[c.address, c.city].filter(Boolean).join(', ')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Production spec — what to make. No pricing shown to the factory. */}
          <Card>
            <CardHeader><CardTitle>What to make</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Size L×W (m)</TableHead>
                      <TableHead className="text-right">Thk (cm)</TableHead>
                      <TableHead className="text-right">Tot. Len (m)</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Tot. Area m²</TableHead>
                      <TableHead>Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => {
                      const isLinear = item.itemType === 'linear'
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <p className="font-medium">{item.description || item.productName}</p>
                            {(item.productName || item.finish) && (
                              <p className="text-xs text-muted-foreground">
                                {[item.stoneColor, item.stoneCategory, item.finish].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isLinear ? '—' : `${trim(item.length)} × ${trim(item.width)}`}
                          </TableCell>
                          <TableCell className="text-right">
                            {isLinear || item.thickness == null ? '—' : `${item.thickness / 10}`}
                          </TableCell>
                          <TableCell className="text-right">{trim(item.totalLength)}</TableCell>
                          <TableCell className="text-right">{isLinear ? '—' : item.quantity}</TableCell>
                          <TableCell className="text-right">{isLinear ? '—' : trim(item.area)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.remark || (isLinear ? 'per linear m' : '')}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Update status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
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
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything worth recording" />
              </div>
              <Button className="w-full" onClick={() => advance.mutate()} loading={advance.isPending} disabled={!stepId}>
                Update status
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> History</CardTitle>
            </CardHeader>
            <CardContent>
              {!timeline?.length ? (
                <p className="text-sm text-muted-foreground">No history yet.</p>
              ) : (
                <ol className="relative space-y-4 border-l pl-4">
                  {timeline.map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      <p className="text-sm font-medium">{h.stepName}</p>
                      {h.note && <p className="text-xs italic text-muted-foreground">“{h.note}”</p>}
                      <p className="text-xs text-muted-foreground">
                        {formatWhen(h.createdAt)}{h.changedBy?.name ? ` · ${h.changedBy.name}` : ''}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
