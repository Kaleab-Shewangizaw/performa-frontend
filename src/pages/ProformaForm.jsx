import { useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { useApiMutation, useSettings } from '@/hooks/useCrud'
import { formatMoney } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const EMPTY_ITEM = { productId: '', width: '', height: '', thickness: '', quantity: 1, unitPrice: '' }

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function ItemRow({ index, control, register, remove, products, setValue }) {
  const item = useWatch({ control, name: `items.${index}` })
  const product = products.find((p) => p.id === item?.productId)

  // Keep thickness valid for the selected product. Must run after the
  // <option> list renders — setting it inside the product onChange races
  // the uncontrolled select's options and silently leaves it empty.
  useEffect(() => {
    if (!product) return
    const current = num(item?.thickness)
    if (!product.thicknessOptions.includes(current)) {
      setValue(`items.${index}.thickness`, String(product.thicknessOptions[0]))
    }
  }, [product, item?.thickness, index, setValue])

  const area = num(item?.width) * num(item?.height)
  const unitPrice = item?.unitPrice !== '' && item?.unitPrice != null
    ? num(item.unitPrice)
    : (product?.defaultUnitPrice ?? 0)
  const lineTotal = area * num(item?.quantity) * unitPrice

  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border p-4 md:grid-cols-12 md:items-end">
      <div className="col-span-2 space-y-1 md:col-span-3">
        <Label className="text-xs">Product</Label>
        <Select
          {...register(`items.${index}.productId`, {
            required: true,
            onChange: (e) => {
              const prod = products.find((p) => p.id === e.target.value)
              if (prod) setValue(`items.${index}.unitPrice`, prod.defaultUnitPrice)
            },
          })}
        >
          <option value="">Select product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.stoneCategory} {p.stoneColor} ({p.finish})
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1 md:col-span-1">
        <Label className="text-xs">Width (m)</Label>
        <Input type="number" step="0.01" min="0.01"
          {...register(`items.${index}.width`, { required: true })} />
      </div>
      <div className="space-y-1 md:col-span-1">
        <Label className="text-xs">Height (m)</Label>
        <Input type="number" step="0.01" min="0.01"
          {...register(`items.${index}.height`, { required: true })} />
      </div>
      <div className="space-y-1 md:col-span-1">
        <Label className="text-xs">Area m²</Label>
        <div className="flex h-9 items-center rounded-md bg-muted px-3 text-sm font-medium">
          {area ? area.toFixed(2) : '—'}
        </div>
      </div>
      <div className="space-y-1 md:col-span-1">
        <Label className="text-xs">Thickness</Label>
        <Select {...register(`items.${index}.thickness`, { required: true })}>
          <option value="">—</option>
          {(product?.thicknessOptions || []).map((t) => (
            <option key={t} value={t}>{t} mm</option>
          ))}
        </Select>
      </div>
      <div className="space-y-1 md:col-span-1">
        <Label className="text-xs">Qty</Label>
        <Input type="number" min="1" step="1"
          {...register(`items.${index}.quantity`, { required: true })} />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label className="text-xs">Price / m²</Label>
        <Input type="number" step="0.01" min="0"
          {...register(`items.${index}.unitPrice`)} />
      </div>
      <div className="space-y-1 md:col-span-1">
        <Label className="text-xs">Line Total</Label>
        <div className="flex h-9 items-center rounded-md bg-muted px-3 text-sm font-semibold">
          {lineTotal ? lineTotal.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
        </div>
      </div>
      <div className="flex justify-end md:col-span-1">
        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

export default function ProformaFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { data: settings } = useSettings()

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => api.get('/customers?limit=100').then((r) => r.data),
  })
  const { data: productsData } = useQuery({
    queryKey: ['products', 'active'],
    queryFn: () => api.get('/products?status=active&limit=100').then((r) => r.data),
  })
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['proforma', id],
    queryFn: () => api.get(`/proformas/${id}`).then((r) => r.data.proforma),
    enabled: isEdit,
  })

  const customers = customersData?.customers || []
  const products = productsData?.products || []
  const currency = settings?.currency || 'ETB'

  const defaultValues = useMemo(() => {
    if (!existing) {
      return {
        customerId: '', discount: 0, vatRate: '', paymentTerms: '', deliveryTime: '',
        validityPeriod: '', notes: '', items: [{ ...EMPTY_ITEM }],
      }
    }
    return {
      customerId: existing.customer?.id || existing.customer,
      discount: existing.discount,
      vatRate: existing.vatRate,
      paymentTerms: existing.paymentTerms,
      deliveryTime: existing.deliveryTime,
      validityPeriod: existing.validityPeriod,
      notes: existing.notes,
      items: existing.items.map((i) => ({
        productId: i.product?.id || i.product,
        width: i.width, height: i.height,
        thickness: String(i.thickness), quantity: i.quantity, unitPrice: i.unitPrice,
      })),
    }
  }, [existing])

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm({
    values: defaultValues,
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = useWatch({ control, name: 'items' }) || []
  const discount = num(useWatch({ control, name: 'discount' }))
  const vatRateRaw = useWatch({ control, name: 'vatRate' })
  const vatRate = vatRateRaw === '' || vatRateRaw == null ? (settings?.defaultVatRate ?? 15) : num(vatRateRaw)

  const subtotal = watchedItems.reduce((sum, item) => {
    const product = products.find((p) => p.id === item?.productId)
    const price = item?.unitPrice !== '' && item?.unitPrice != null
      ? num(item.unitPrice)
      : (product?.defaultUnitPrice ?? 0)
    return sum + num(item?.width) * num(item?.height) * num(item?.quantity) * price
  }, 0)
  const cappedDiscount = Math.min(discount, subtotal)
  const vatAmount = (subtotal - cappedDiscount) * (vatRate / 100)
  const grandTotal = subtotal - cappedDiscount + vatAmount

  const mutation = useApiMutation({
    mutationFn: ({ asDraft, data }) => {
      const payload = {
        customerId: data.customerId,
        discount: num(data.discount),
        ...(data.vatRate !== '' && data.vatRate != null ? { vatRate: num(data.vatRate) } : {}),
        paymentTerms: data.paymentTerms || undefined,
        deliveryTime: data.deliveryTime || undefined,
        validityPeriod: data.validityPeriod || undefined,
        notes: data.notes || undefined,
        items: data.items.map((i) => ({
          productId: i.productId,
          width: num(i.width),
          height: num(i.height),
          thickness: num(i.thickness),
          quantity: num(i.quantity),
          ...(i.unitPrice !== '' && i.unitPrice != null ? { unitPrice: num(i.unitPrice) } : {}),
        })),
        ...(isEdit ? { submit: !asDraft } : { asDraft }),
      }
      return isEdit ? api.put(`/proformas/${id}`, payload) : api.post('/proformas', payload)
    },
    invalidate: ['proformas', 'proforma', 'dashboard'],
    successMessage: isEdit ? 'Proforma updated' : 'Proforma created',
    onSuccess: (res) => navigate(`/proformas/${res.data.proforma.id}`),
  })

  if (isEdit && loadingExisting) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>
  }

  return (
    <div className="max-w-5xl">
      <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <PageHeader
        title={isEdit ? `Edit ${existing?.proformaNumber || 'Proforma'}` : 'New Proforma'}
        description="Line totals are recalculated automatically from dimensions and pricing"
      />

      <form className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Customer & Terms</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <Select {...register('customerId', { required: 'Select a customer' })}>
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}{c.companyName ? ` — ${c.companyName}` : ''}
                  </option>
                ))}
              </Select>
              {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Payment Terms</Label>
              <Input {...register('paymentTerms')} placeholder={settings?.defaultPaymentTerms} />
            </div>
            <div className="space-y-1.5">
              <Label>Delivery Time</Label>
              <Input {...register('deliveryTime')} placeholder="e.g. 2 weeks after confirmation" />
            </div>
            <div className="space-y-1.5">
              <Label>Validity Period</Label>
              <Input {...register('validityPeriod')} placeholder={`${settings?.defaultValidityDays ?? 30} days`} />
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <Label>Notes</Label>
              <Input {...register('notes')} placeholder="Optional notes shown on the proforma" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ ...EMPTY_ITEM })}>
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, index) => (
              <ItemRow
                key={field.id}
                index={index}
                control={control}
                register={register}
                remove={fields.length > 1 ? remove : () => {}}
                products={products}
                setValue={setValue}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Discount ({currency})</Label>
                  <Input type="number" step="0.01" min="0" {...register('discount')} />
                </div>
                <div className="space-y-1.5">
                  <Label>VAT Rate (%)</Label>
                  <Input
                    type="number" step="0.1" min="0" max="100"
                    placeholder={String(settings?.defaultVatRate ?? 15)}
                    {...register('vatRate')}
                  />
                </div>
              </div>
              <div className="space-y-1 rounded-lg bg-muted p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatMoney(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium">- {formatMoney(cappedDiscount, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT ({vatRate}%)</span>
                  <span className="font-medium">{formatMoney(vatAmount, currency)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
                  <span>Grand Total</span>
                  <span>{formatMoney(grandTotal, currency)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          {!isEdit && (
            <Button
              type="button"
              variant="secondary"
              loading={mutation.isPending}
              onClick={handleSubmit((data) => mutation.mutate({ asDraft: true, data }))}
            >
              Save as draft
            </Button>
          )}
          <Button
            type="button"
            loading={mutation.isPending}
            onClick={handleSubmit((data) => mutation.mutate({ asDraft: false, data }))}
          >
            {isEdit ? 'Save & submit for approval' : 'Create & submit for approval'}
          </Button>
        </div>
      </form>
    </div>
  )
}
