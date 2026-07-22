import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, FileDown, Pencil, Trash2, Check, X, Send, History, Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage, storage } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useApiMutation, useSettings } from '@/hooks/useCrud'
import { formatMoney, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

// Measurements print at their natural precision (0.868, not 0.87).
function trim(n) {
  if (n === null || n === undefined) return '—'
  return String(Number(Number(n).toFixed(4)))
}

const ACTION_LABELS = {
  created: 'created this proforma as a draft',
  submitted: 'submitted for approval',
  updated: 'updated the proforma',
  supervisor_approved: 'approved (supervisor)',
  admin_approved: 'gave final approval',
  rejected: 'rejected',
  reverted_to_draft: 'reverted to draft',
  auto_approved: 'approved automatically (pre-approved products)',
}

function DecisionDialog({ open, onClose, mode, onConfirm, loading }) {
  const [text, setText] = useState('')
  const isReject = mode === 'reject'
  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogHeader>
        <DialogTitle>{isReject ? 'Reject proforma' : 'Approve proforma'}</DialogTitle>
        <DialogDescription>
          {isReject
            ? 'Provide a reason — the sales person will be notified.'
            : 'Optionally add a comment for the approval history.'}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label>{isReject ? 'Reason *' : 'Comment'}</Label>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant={isReject ? 'destructive' : 'success'}
          loading={loading}
          disabled={isReject && text.trim().length < 3}
          onClick={() => onConfirm(text.trim())}
        >
          {isReject ? 'Reject' : 'Approve'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

export default function ProformaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, role, isAdmin, isSupervisor, isSales } = useAuth()
  const { data: settings } = useSettings()
  const [decision, setDecision] = useState(null) // 'approve' | 'reject' | null
  const [deleting, setDeleting] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const { data: proforma, isLoading, isError, refetch } = useQuery({
    queryKey: ['proforma', id],
    queryFn: () => api.get(`/proformas/${id}`).then((r) => r.data.proforma),
  })
  const { data: historyData } = useQuery({
    queryKey: ['proforma-history', id],
    queryFn: () => api.get(`/proformas/${id}/history`).then((r) => r.data.history),
  })

  const invalidate = ['proformas', 'proforma', 'proforma-history', 'dashboard', 'notifications']

  const approveMutation = useApiMutation({
    mutationFn: (comment) => api.post(`/proformas/${id}/approve`, { comment }),
    invalidate,
    successMessage: 'Proforma approved',
    onSuccess: () => setDecision(null),
  })
  const rejectMutation = useApiMutation({
    mutationFn: (reason) => api.post(`/proformas/${id}/reject`, { reason }),
    invalidate,
    successMessage: 'Proforma rejected',
    onSuccess: () => setDecision(null),
  })
  const submitMutation = useApiMutation({
    mutationFn: () => api.post(`/proformas/${id}/submit`),
    invalidate,
    successMessage: 'Submitted for approval',
  })
  const deleteMutation = useApiMutation({
    mutationFn: () => api.delete(`/proformas/${id}`),
    invalidate: ['proformas', 'dashboard'],
    successMessage: 'Proforma deleted',
    onSuccess: () => navigate('/proformas'),
  })

  const downloadPdf = async () => {
    setDownloading(true)
    try {
      const res = await fetch(`/api/proformas/${id}/pdf`, {
        headers: { Authorization: `Bearer ${storage.accessToken}` },
      })
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>
  }
  if (isError || !proforma) return <ErrorState onRetry={refetch} />

  const currency = settings?.currency || 'ETB'
  const c = proforma.customer || {}
  const isOwner = (proforma.salesPerson?.id || proforma.salesPerson) === user?.id
  // Sales edit their own until approved; supervisors edit any proforma up to
  // final approval; admins can edit at any stage, including after approval.
  const canEdit =
    (isSales && isOwner && ['draft', 'pending', 'rejected'].includes(proforma.status)) ||
    (isSupervisor && ['draft', 'pending', 'supervisor_approved', 'rejected'].includes(proforma.status)) ||
    isAdmin
  const canApprove =
    (isSupervisor && proforma.status === 'pending') ||
    (isAdmin && ['pending', 'supervisor_approved'].includes(proforma.status))
  const canReject =
    (isSupervisor && proforma.status === 'pending') ||
    (isAdmin && ['pending', 'supervisor_approved', 'approved'].includes(proforma.status))
  const canDelete = isAdmin || (isSales && isOwner && proforma.status === 'draft')

  return (
    <div className="w-full">
      <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate('/proformas')}>
        <ArrowLeft className="h-4 w-4" /> All proformas
      </Button>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{proforma.proformaNumber}</h1>
          <StatusBadge status={proforma.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadPdf} loading={downloading}>
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          {proforma.status === 'draft' && (isOwner || isAdmin) && (
            <Button onClick={() => submitMutation.mutate()} loading={submitMutation.isPending}>
              <Send className="h-4 w-4" /> Submit for approval
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => navigate(`/proformas/${id}/edit`)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
          {canApprove && (
            <Button variant="success" onClick={() => setDecision('approve')}>
              <Check className="h-4 w-4" />
              {role === 'supervisor' ? 'Approve' : 'Final approve'}
            </Button>
          )}
          {canReject && (
            <Button variant="destructive" onClick={() => setDecision('reject')}>
              <X className="h-4 w-4" /> Reject
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="icon" onClick={() => setDeleting(true)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {proforma.status === 'rejected' && proforma.rejectionReason && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <span className="font-semibold">Rejection reason: </span>
          {proforma.rejectionReason}
        </div>
      )}

      {proforma.autoApproved && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <Zap className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-semibold">Approved automatically. </span>
            All items are pre-approved products, so no supervisor or admin review was required.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
            <CardContent className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              {proforma.orderNumber && <p><span className="text-muted-foreground">Order no: </span>{proforma.orderNumber}</p>}
              {proforma.materialType && <p><span className="text-muted-foreground">Material type: </span>{proforma.materialType}</p>}
              {proforma.orderedBy && <p><span className="text-muted-foreground">Ordered by: </span>{proforma.orderedBy}</p>}
              {proforma.orderedDate && <p><span className="text-muted-foreground">Ordered date: </span>{formatDate(proforma.orderedDate)}</p>}
              {proforma.projectName && <p><span className="text-muted-foreground">Project: </span>{proforma.projectName}</p>}
              {proforma.deliveryTime && <p><span className="text-muted-foreground">Delivery date: </span>{proforma.deliveryTime}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <p><span className="text-muted-foreground">Name: </span>{c.fullName}</p>
              {c.companyName && <p><span className="text-muted-foreground">Company: </span>{c.companyName}</p>}
              <p><span className="text-muted-foreground">Phone: </span>{c.phone}</p>
              {c.email && <p><span className="text-muted-foreground">Email: </span>{c.email}</p>}
              {(c.address || c.city) && (
                <p className="sm:col-span-2">
                  <span className="text-muted-foreground">Address: </span>
                  {[c.address, c.city].filter(Boolean).join(', ')}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Size L×W (m)</TableHead>
                    <TableHead className="text-right">Thk (cm)</TableHead>
                    <TableHead className="text-right">Tot. Len (m)</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Tot. Area m²</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proforma.items.map((item) => {
                    const isLinear = item.itemType === 'linear'
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium">{item.description || item.productName}</p>
                          {(item.productName || item.finish) && (
                            <p className="text-xs text-muted-foreground">
                              {[item.productName, item.finish].filter(Boolean).join(' · ')}
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
                        <TableCell className="text-right">{Number(item.unitPrice).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">{Number(item.lineTotal).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.remark || (isLinear ? 'per linear m' : '')}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <div className="flex justify-end border-t p-4">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span>{formatMoney(proforma.subtotal, currency)}</span>
                  </div>
                  {proforma.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span>- {formatMoney(proforma.discount, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{proforma.vatRate}% VAT</span>
                    <span>{formatMoney(proforma.vatAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 text-base font-bold">
                    <span>Total incl. VAT</span>
                    <span>{formatMoney(proforma.grandTotal, currency)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Sales person: </span>{proforma.salesPerson?.name}</p>
              <p><span className="text-muted-foreground">Issue date: </span>{formatDate(proforma.issueDate)}</p>
              <p><span className="text-muted-foreground">Expiry date: </span>{formatDate(proforma.expiryDate)}</p>
              {proforma.paymentTerms && <p><span className="text-muted-foreground">Payment: </span>{proforma.paymentTerms}</p>}
              {proforma.deliveryTime && <p><span className="text-muted-foreground">Delivery: </span>{proforma.deliveryTime}</p>}
              {proforma.validityPeriod && <p><span className="text-muted-foreground">Validity: </span>{proforma.validityPeriod}</p>}
              {proforma.totalWeight && <p><span className="text-muted-foreground">Total weight: </span>{proforma.totalWeight}</p>}
              {proforma.remark && <p><span className="text-muted-foreground">Remark: </span>{proforma.remark}</p>}
              {proforma.notes && <p><span className="text-muted-foreground">Notes: </span>{proforma.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" /> Approval History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!historyData?.length ? (
                <p className="text-sm text-muted-foreground">No history yet</p>
              ) : (
                <ol className="relative space-y-4 border-l pl-4">
                  {historyData.map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      <p className="text-sm">
                        <span className="font-medium">{h.actor?.name}</span>{' '}
                        {ACTION_LABELS[h.action] || h.action}
                      </p>
                      {h.comment && <p className="text-xs italic text-muted-foreground">“{h.comment}”</p>}
                      <p className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {decision && (
        <DecisionDialog
          open
          mode={decision}
          onClose={() => setDecision(null)}
          loading={approveMutation.isPending || rejectMutation.isPending}
          onConfirm={(text) =>
            decision === 'approve' ? approveMutation.mutate(text) : rejectMutation.mutate(text)
          }
        />
      )}
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => deleteMutation.mutate()}
        title={`Delete ${proforma.proformaNumber}?`}
        description="This will permanently remove the proforma and its history."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
