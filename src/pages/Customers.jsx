import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useList, useApiMutation } from '@/hooks/useCrud'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { TableSkeleton } from '@/components/ui/skeleton'

const EMPTY = {
  fullName: '', companyName: '', phone: '', email: '',
  address: '', city: '', taxNumber: '', notes: '',
}

function CustomerFormDialog({ open, onClose, customer }) {
  const isEdit = !!customer
  const { register, handleSubmit, formState: { errors } } = useForm({
    values: customer || EMPTY,
  })

  const mutation = useApiMutation({
    mutationFn: (data) =>
      isEdit ? api.put(`/customers/${customer.id}`, data) : api.post('/customers', data),
    invalidate: 'customers',
    successMessage: isEdit ? 'Customer updated' : 'Customer created',
    onSuccess: onClose,
  })

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit Customer' : 'New Customer'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input {...register('fullName', { required: 'Required' })} />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input {...register('companyName')} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone *</Label>
            <Input {...register('phone', { required: 'Required' })} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" {...register('email')} />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input {...register('address')} />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input {...register('city')} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Tax Number (optional)</Label>
            <Input {...register('taxNumber')} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea {...register('notes')} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create customer'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

export default function CustomersPage() {
  const { isSales, isAdmin } = useAuth()
  const canManage = isSales || isAdmin
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState(null) // { customer } | null
  const [deleting, setDeleting] = useState(null)

  const { data, isLoading, isError, refetch } = useList('customers', '/customers', { q, page })

  const deleteMutation = useApiMutation({
    mutationFn: (id) => api.delete(`/customers/${id}`),
    invalidate: 'customers',
    successMessage: 'Customer deleted',
    onSuccess: () => setDeleting(null),
  })

  const customers = data?.customers || []

  return (
    <div>
      <PageHeader title="Customers" description="Manage your customer directory">
        {canManage && (
          <Button onClick={() => setDialog({ customer: null })}>
            <Plus className="h-4 w-4" /> New Customer
          </Button>
        )}
      </PageHeader>

      <Card>
        <div className="border-b p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, company, phone..."
              className="pl-9"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description={q ? 'Try a different search term.' : 'Create your first customer to get started.'}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">City</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.fullName}</TableCell>
                  <TableCell>{c.companyName || '-'}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell className="hidden md:table-cell">{c.email || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">{c.city || '-'}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDialog({ customer: c })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(c)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pagination pagination={data?.pagination} onPageChange={setPage} />
      </Card>

      {dialog && (
        <CustomerFormDialog open onClose={() => setDialog(null)} customer={dialog.customer} />
      )}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate(deleting.id)}
        title={`Delete ${deleting?.fullName}?`}
        description="Customers with existing proformas cannot be deleted."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
