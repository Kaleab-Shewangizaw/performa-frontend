import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Power, ListChecks } from 'lucide-react'
import { api } from '@/lib/api'
import { useList, useApiMutation } from '@/hooks/useCrud'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { TableSkeleton } from '@/components/ui/skeleton'

function StepFormDialog({ open, onClose, step }) {
  const isEdit = !!step
  const { register, handleSubmit, formState: { errors } } = useForm({
    values: { name: step?.name || '' },
  })

  const mutation = useApiMutation({
    mutationFn: (data) =>
      isEdit ? api.put(`/order-steps/${step.id}`, data) : api.post('/order-steps', data),
    invalidate: 'order-steps',
    successMessage: isEdit ? 'Step renamed' : 'Step added',
    onSuccess: onClose,
  })

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Rename step' : 'New step'}</DialogTitle>
        <DialogDescription>
          Steps make up the production pipeline every approved order moves through.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Step name *</Label>
          <Input placeholder="e.g. Packaging" {...register('name', { required: 'Required' })} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEdit ? 'Save' : 'Add step'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

export default function OrderStepsPage() {
  const [dialog, setDialog] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const { data, isLoading, isError, refetch } = useList('order-steps', '/order-steps')
  const steps = data?.steps || []

  const reorder = useApiMutation({
    mutationFn: async ({ a, b }) => {
      await api.put(`/order-steps/${a.id}`, { position: b.position })
      await api.put(`/order-steps/${b.id}`, { position: a.position })
    },
    invalidate: 'order-steps',
  })

  const toggle = useApiMutation({
    mutationFn: (s) => api.put(`/order-steps/${s.id}`, { isActive: !s.isActive }),
    invalidate: 'order-steps',
    successMessage: 'Step updated',
  })

  const remove = useApiMutation({
    mutationFn: (s) => api.delete(`/order-steps/${s.id}`),
    invalidate: 'order-steps',
    successMessage: 'Step removed',
    onSuccess: () => setDeleting(null),
  })

  return (
    <div>
      <PageHeader
        title="Order steps"
        description="The production stages an order moves through after approval. Customers see these on the tracking page."
      >
        <Button onClick={() => setDialog({ step: null })}>
          <Plus className="h-4 w-4" /> New step
        </Button>
      </PageHeader>

      <Card>
        {isLoading ? (
          <TableSkeleton cols={4} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : steps.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No steps yet"
            description="Add the stages your orders move through, in order."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Order</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {steps.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={i === 0 || reorder.isPending}
                        onClick={() => reorder.mutate({ a: s, b: steps[i - 1] })}
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={i === steps.length - 1 || reorder.isPending}
                        onClick={() => reorder.mutate({ a: s, b: steps[i + 1] })}
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? 'success' : 'secondary'}>
                      {s.isActive ? 'Active' : 'Hidden'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggle.mutate(s)}
                        title={s.isActive ? 'Hide from pipeline' : 'Make active'}
                      >
                        <Power className={s.isActive ? 'h-4 w-4 text-success' : 'h-4 w-4 text-muted-foreground'} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDialog({ step: s })} title="Rename">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(s)} title="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {dialog && <StepFormDialog open onClose={() => setDialog(null)} step={dialog.step} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting)}
        title={`Delete "${deleting?.name}"?`}
        description="If any orders have used this step, it will be hidden instead of deleted so their history stays intact."
        confirmLabel="Delete"
        loading={remove.isPending}
      />
    </div>
  )
}
