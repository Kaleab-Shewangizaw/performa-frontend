import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useList, useApiMutation, useProductMeta, useSettings } from '@/hooks/useCrud'
import { formatMoney } from '@/lib/utils'
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

function ProductFormDialog({ open, onClose, product, meta }) {
  const isEdit = !!product
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    values: product
      ? { ...product, defaultUnitPrice: product.defaultUnitPrice }
      : {
          name: '', stoneCategory: meta.stoneCategories[0], stoneColor: '',
          finish: meta.finishes[0], thicknessOptions: [20], defaultUnitPrice: '', status: 'active',
        },
  })
  const thicknesses = watch('thicknessOptions') || []

  const toggleThickness = (t) => {
    setValue(
      'thicknessOptions',
      thicknesses.includes(t) ? thicknesses.filter((x) => x !== t) : [...thicknesses, t].sort((a, b) => a - b)
    )
  }

  const mutation = useApiMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        defaultUnitPrice: Number(data.defaultUnitPrice),
        thicknessOptions: data.thicknessOptions,
      }
      return isEdit ? api.put(`/products/${product.id}`, payload) : api.post('/products', payload)
    },
    invalidate: 'products',
    successMessage: isEdit ? 'Product updated' : 'Product created',
    onSuccess: onClose,
  })

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit Product' : 'New Product'}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={handleSubmit((d) => {
          if (!d.thicknessOptions?.length) return
          mutation.mutate(d)
        })}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Product Name *</Label>
            <Input {...register('name', { required: 'Required' })} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Stone Category</Label>
            <Select {...register('stoneCategory')}>
              {meta.stoneCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Stone Color *</Label>
            <Input {...register('stoneColor', { required: 'Required' })} />
            {errors.stoneColor && <p className="text-xs text-destructive">{errors.stoneColor.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Finish</Label>
            <Select {...register('finish')}>
              {meta.finishes.map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Default Unit Price (per m²) *</Label>
            <Input
              type="number" step="0.01" min="0"
              {...register('defaultUnitPrice', { required: 'Required', min: 0 })}
            />
            {errors.defaultUnitPrice && <p className="text-xs text-destructive">Required</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Thickness Options (mm)</Label>
            <div className="flex flex-wrap gap-2">
              {meta.thicknessOptions.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => toggleThickness(t)}
                  className={`rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                    thicknesses.includes(t)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-card hover:bg-accent'
                  }`}
                >
                  {t} mm
                </button>
              ))}
            </div>
            {thicknesses.length === 0 && (
              <p className="text-xs text-destructive">Select at least one thickness</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create product'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

export default function ProductsPage() {
  const { isAdmin } = useAuth()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const { data: meta } = useProductMeta()
  const { data: settings } = useSettings()
  const { data, isLoading, isError, refetch } = useList('products', '/products', {
    q, page, stoneCategory: category || undefined,
  })

  const deleteMutation = useApiMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    invalidate: 'products',
    successMessage: 'Product removed',
    onSuccess: () => setDeleting(null),
  })

  const products = data?.products || []
  const currency = settings?.currency || 'ETB'

  return (
    <div>
      <PageHeader title="Product Catalog" description="Stone products, finishes, and pricing">
        {isAdmin && meta && (
          <Button onClick={() => setDialog({ product: null })}>
            <Plus className="h-4 w-4" /> New Product
          </Button>
        )}
      </PageHeader>

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name or color..."
              className="pl-9"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1) }}
            />
          </div>
          <Select
            className="sm:w-44"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1) }}
          >
            <option value="">All categories</option>
            {meta?.stoneCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : products.length === 0 ? (
          <EmptyState icon={Package} title="No products found" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden md:table-cell">Color</TableHead>
                <TableHead className="hidden md:table-cell">Finish</TableHead>
                <TableHead className="hidden lg:table-cell">Thickness</TableHead>
                <TableHead className="text-right">Price/m²</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.stoneCategory}</TableCell>
                  <TableCell className="hidden md:table-cell">{p.stoneColor}</TableCell>
                  <TableCell className="hidden md:table-cell">{p.finish}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {p.thicknessOptions.map((t) => `${t}mm`).join(', ')}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(p.defaultUnitPrice, currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'active' ? 'success' : 'secondary'}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDialog({ product: p })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleting(p)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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

      {dialog && meta && (
        <ProductFormDialog open onClose={() => setDialog(null)} product={dialog.product} meta={meta} />
      )}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate(deleting.id)}
        title={`Delete ${deleting?.name}?`}
        description="Products used in proformas will be deactivated instead of deleted."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
