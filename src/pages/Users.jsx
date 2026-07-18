import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, UserX, UserCheck, UserCog } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useList, useApiMutation } from '@/hooks/useCrud'
import { formatDate, ROLE_LABELS } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { TableSkeleton } from '@/components/ui/skeleton'

const ROLE_VARIANTS = { admin: 'default', supervisor: 'info', sales: 'secondary' }

function UserFormDialog({ open, onClose, user }) {
  const isEdit = !!user
  const { register, handleSubmit, formState: { errors } } = useForm({
    values: user
      ? { name: user.name, email: user.email, role: user.role, password: '' }
      : { name: '', email: '', role: 'sales', password: '' },
  })

  const mutation = useApiMutation({
    mutationFn: (data) => {
      const payload = { ...data }
      if (isEdit && !payload.password) delete payload.password
      return isEdit ? api.put(`/users/${user.id}`, payload) : api.post('/users', payload)
    },
    invalidate: 'users',
    successMessage: isEdit ? 'User updated' : 'User created',
    onSuccess: onClose,
  })

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit User' : 'New User'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Name *</Label>
          <Input {...register('name', { required: 'Required' })} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Email *</Label>
          <Input type="email" {...register('email', { required: 'Required' })} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select {...register('role')}>
            <option value="sales">Sales</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</Label>
          <Input
            type="password"
            {...register('password', {
              required: isEdit ? false : 'Required',
              validate: (v) => !v || v.length >= 8 || 'At least 8 characters',
            })}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState(null)
  const [toggling, setToggling] = useState(null)

  const { data, isLoading, isError, refetch } = useList('users', '/users', { page })

  const toggleMutation = useApiMutation({
    mutationFn: (u) => api.post(`/users/${u.id}/${u.isActive ? 'deactivate' : 'reactivate'}`),
    invalidate: 'users',
    successMessage: 'User updated',
    onSuccess: () => setToggling(null),
  })

  const users = data?.users || []

  return (
    <div>
      <PageHeader title="Users" description="Manage system users and roles">
        <Button onClick={() => setDialog({ user: null })}>
          <Plus className="h-4 w-4" /> New User
        </Button>
      </PageHeader>

      <Card>
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : users.length === 0 ? (
          <EmptyState icon={UserCog} title="No users" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name} {u.id === me?.id && <span className="text-xs text-muted-foreground">(you)</span>}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANTS[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? 'success' : 'destructive'}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setDialog({ user: u })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {u.id !== me?.id && (
                        <Button variant="ghost" size="icon" onClick={() => setToggling(u)}>
                          {u.isActive
                            ? <UserX className="h-4 w-4 text-destructive" />
                            : <UserCheck className="h-4 w-4 text-success" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pagination pagination={data?.pagination} onPageChange={setPage} />
      </Card>

      {dialog && <UserFormDialog open onClose={() => setDialog(null)} user={dialog.user} />}
      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        onConfirm={() => toggleMutation.mutate(toggling)}
        title={`${toggling?.isActive ? 'Deactivate' : 'Reactivate'} ${toggling?.name}?`}
        description={
          toggling?.isActive
            ? 'The user will no longer be able to sign in.'
            : 'The user will regain access to the system.'
        }
        confirmLabel={toggling?.isActive ? 'Deactivate' : 'Reactivate'}
        variant={toggling?.isActive ? 'destructive' : 'default'}
        loading={toggleMutation.isPending}
      />
    </div>
  )
}
