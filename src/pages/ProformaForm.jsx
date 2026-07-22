import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2, ArrowLeft, Ruler, Zap } from 'lucide-react'
import { api } from '@/lib/api'
import { useApiMutation, useSettings, useProductMeta } from '@/hooks/useCrud'
import { formatMoney, sameId } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const EMPTY_AREA_ITEM = {
  itemType: 'area', description: '', productId: '', length: '', width: '',
  thickness: '', quantity: 1, unitPrice: '', remark: '',
}
const EMPTY_LINEAR_ITEM = {
  itemType: 'linear', description: '', productId: '', length: '', width: '',
  thickness: '', quantity: 1, unitPrice: '', remark: '',
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// Mirrors the server: measurements keep precision, money rounds to 2dp.
function computeItem(item, products) {
  const product = products.find((p) => sameId(p.id, item?.productId))
  const isLinear = item?.itemType === 'linear'
  const quantity = num(item?.quantity) || 0
  const totalLength = num(item?.length) * quantity
  const area = isLinear ? 0 : num(item?.length) * num(item?.width) * quantity
  const unitPrice =
    item?.unitPrice !== '' && item?.unitPrice != null
      ? num(item.unitPrice)
      : (product?.defaultUnitPrice ?? 0)
  const lineTotal = (isLinear ? totalLength : area) * unitPrice
  return { product, isLinear, totalLength, area, unitPrice, lineTotal }
}

function ItemRow({ index, control, register, remove, products, setValue, meta, currency }) {
  const item = useWatch({ control, name: `items.${index}` })
  const { product, isLinear, totalLength, area, lineTotal } = computeItem(item, products)

  // Keep thickness valid for the selected product. Runs after the <option>
  // list renders, which a change handler cannot guarantee.
  useEffect(() => {
    if (!product || isLinear) return
    const current = num(item?.thickness)
    if (!product.thicknessOptions.includes(current)) {
      setValue(`items.${index}.thickness`, String(product.thicknessOptions[0]))
    }
  }, [product, isLinear, item?.thickness, index, setValue])

  const suggestions = isLinear ? meta?.linearServices : meta?.elementTypes

  return (
    <div className="rounded-lg border p-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-12 md:items-end">
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs">Type</Label>
          <Select {...register(`items.${index}.itemType`)}>
            <option value="area">Cut stone (m²)</option>
            <option value="linear">Edge work (per m)</option>
          </Select>
        </div>

        <div className="space-y-1 md:col-span-3">
          <Label className="text-xs">Description *</Label>
          <Input
            list={`elements-${index}`}
            placeholder={isLinear ? 'Bullnose' : 'Window sill'}
            {...register(`items.${index}.description`, { required: true })}
          />
          <datalist id={`elements-${index}`}>
            {(suggestions || []).map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>

        <div className="space-y-1 md:col-span-3">
          <Label className="text-xs">Material {isLinear && <span className="text-muted-foreground">(optional)</span>}</Label>
          <Select
            {...register(`items.${index}.productId`, {
              onChange: (e) => {
                const prod = products.find((p) => sameId(p.id, e.target.value))
                if (prod) setValue(`items.${index}.unitPrice`, prod.defaultUnitPrice)
              },
            })}
          >
            <option value="">—</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.stoneCategory} ({p.finish})
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs">{isLinear ? 'Length (m)' : 'Length (m)'} *</Label>
          <Input type="number" step="0.001" min="0.001"
            {...register(`items.${index}.length`, { required: true })} />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs">Width (m){!isLinear && ' *'}</Label>
          <Input type="number" step="0.001" min="0.001" disabled={isLinear}
            className={isLinear ? 'bg-muted' : ''}
            {...register(`items.${index}.width`, { required: !isLinear })} />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs">Thickness (cm)</Label>
          <Select disabled={isLinear} className={isLinear ? 'bg-muted' : ''}
            {...register(`items.${index}.thickness`, { required: !isLinear })}>
            <option value="">—</option>
            {(product?.thicknessOptions || meta?.thicknessOptions || []).map((t) => (
              <option key={t} value={t}>{t / 10} cm</option>
            ))}
          </Select>
        </div>

        <div className="space-y-1 md:col-span-1">
          <Label className="text-xs">Qty</Label>
          <Input type="number" min="1" step="1"
            {...register(`items.${index}.quantity`, { required: true })} />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs">Unit Price ({currency}) *</Label>
          <Input type="number" step="0.01" min="0"
            {...register(`items.${index}.unitPrice`, { required: true })} />
        </div>

        <div className="space-y-1 md:col-span-3">
          <Label className="text-xs">Remark</Label>
          <Input placeholder="e.g. Bullnose and Groove" {...register(`items.${index}.remark`)} />
        </div>

        <div className="col-span-2 flex justify-end md:col-span-1">
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t pt-2 text-xs text-muted-foreground">
        <span>Total length: <b className="text-foreground">{totalLength ? totalLength.toFixed(3).replace(/\.?0+$/, '') : '—'} m</b></span>
        <span>Total area: <b className="text-foreground">{isLinear ? '—' : (area ? area.toFixed(4).replace(/\.?0+$/, '') : '—')} m²</b></span>
        <span className="ml-auto">Amount: <b className="text-foreground">{formatMoney(lineTotal, currency)}</b></span>
      </div>
    </div>
  )
}

export default function ProformaFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const { data: settings } = useSettings()
  const { data: meta } = useProductMeta()

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => api.get('/customers?limit=100').then((r) => r.data),
  })
  const { data: productsData } = useQuery({
    queryKey: ['products', 'active'],
    queryFn: () => api.get('/products?status=active&limit=100').then((r) => r.data),
  })
  const { data: existing } = useQuery({
    queryKey: ['proforma', id],
    queryFn: () => api.get(`/proformas/${id}`).then((r) => r.data.proforma),
    enabled: isEdit,
  })

  // Mount the form only once every option list is loaded — react-hook-form
  // applies `values` to uncontrolled selects via the DOM, so the <option>
  // elements must exist first or the selects silently stay empty.
  if (!customersData || !productsData || !meta || (isEdit && !existing)) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>
  }

  return (
    <ProformaFormInner
      id={id}
      isEdit={isEdit}
      existing={existing}
      customers={customersData.customers}
      products={productsData.products}
      settings={settings}
      meta={meta}
    />
  )
}

function ProformaFormInner({ id, isEdit, existing, customers, products, settings, meta }) {
  const navigate = useNavigate()
  const currency = settings?.currency || 'ETB'
  const standardVat = settings?.defaultVatRate ?? 15

  const defaultValues = existing
    ? {
        customerId: existing.customer?.id ?? '',
        orderNumber: existing.orderNumber || '',
        materialType: existing.materialType || '',
        orderedBy: existing.orderedBy || '',
        orderedDate: existing.orderedDate ? String(existing.orderedDate).slice(0, 10) : '',
        projectName: existing.projectName || '',
        discount: existing.discount,
        vatRate: existing.vatRate,
        paymentTerms: existing.paymentTerms,
        deliveryTime: existing.deliveryTime,
        validityPeriod: existing.validityPeriod,
        totalWeight: existing.totalWeight || '',
        remark: existing.remark || '',
        notes: existing.notes || '',
        items: existing.items.map((i) => ({
          itemType: i.itemType || 'area',
          description: i.description || '',
          productId: i.product ?? '',
          length: i.length,
          width: i.width ?? '',
          thickness: i.thickness != null ? String(i.thickness) : '',
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          remark: i.remark || '',
        })),
      }
    : {
        customerId: '', orderNumber: '', materialType: '', orderedBy: '', orderedDate: '',
        projectName: '', discount: 0, vatRate: standardVat, paymentTerms: '', deliveryTime: '',
        validityPeriod: '', totalWeight: '', remark: '', notes: '',
        items: [{ ...EMPTY_AREA_ITEM }],
      }

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm({
    values: defaultValues,
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = useWatch({ control, name: 'items' }) || []
  const discount = num(useWatch({ control, name: 'discount' }))
  const vatRateRaw = useWatch({ control, name: 'vatRate' })
  // VAT is all-or-nothing: the company's standard rate, or waived.
  const vatRate = num(vatRateRaw) > 0 ? standardVat : 0

  const subtotal = watchedItems.reduce(
    (sum, item) => sum + computeItem(item, products).lineTotal,
    0
  )
  const cappedDiscount = Math.min(discount, subtotal)
  const vatAmount = (subtotal - cappedDiscount) * (vatRate / 100)
  const grandTotal = subtotal - cappedDiscount + vatAmount

  const mutation = useApiMutation({
    mutationFn: ({ asDraft, data }) => {
      const payload = {
        customerId: Number(data.customerId),
        orderNumber: data.orderNumber || '',
        materialType: data.materialType || '',
        orderedBy: data.orderedBy || '',
        orderedDate: data.orderedDate || null,
        projectName: data.projectName || '',
        discount: num(data.discount),
        vatRate: num(data.vatRate) > 0 ? standardVat : 0,
        paymentTerms: data.paymentTerms || undefined,
        deliveryTime: data.deliveryTime || undefined,
        validityPeriod: data.validityPeriod || undefined,
        totalWeight: data.totalWeight || '',
        remark: data.remark || '',
        notes: data.notes || undefined,
        items: data.items.map((i) => {
          const isLinear = i.itemType === 'linear'
          return {
            itemType: i.itemType,
            description: i.description,
            productId: i.productId ? Number(i.productId) : null,
            length: num(i.length),
            width: isLinear ? null : num(i.width),
            thickness: isLinear || !i.thickness ? null : num(i.thickness),
            quantity: num(i.quantity) || 1,
            unitPrice: num(i.unitPrice),
            remark: i.remark || '',
          }
        }),
        ...(isEdit ? { submit: !asDraft } : { asDraft }),
      }
      return isEdit ? api.put(`/proformas/${id}`, payload) : api.post('/proformas', payload)
    },
    invalidate: ['proformas', 'proforma', 'dashboard'],
    successMessage: isEdit ? 'Proforma updated' : 'Proforma created',
    onSuccess: (res) => navigate(`/proformas/${res.data.proforma.id}`),
  })

  const lockedStatus = ['approved', 'supervisor_approved'].includes(existing?.status)

  // Every line pre-cleared means the proforma is approved on submission.
  const allDirect =
    watchedItems.length > 0 &&
    watchedItems.every((i) =>
      products.find((p) => sameId(p.id, i?.productId))?.allowsDirectApproval === true
    )

  return (
    <div className="w-full">
      <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <PageHeader
        title={isEdit ? `Edit ${existing?.proformaNumber || 'Proforma'}` : 'New Proforma'}
        description="Areas and amounts are recalculated automatically from the dimensions"
      />

      <form className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
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
              <Label>Order No.</Label>
              <Input {...register('orderNumber')} placeholder="Customer's order reference" />
            </div>
            <div className="space-y-1.5">
              <Label>Material Type</Label>
              <Input {...register('materialType')} placeholder="e.g. Harer Granite" />
            </div>
            <div className="space-y-1.5">
              <Label>Material Ordered by</Label>
              <Input {...register('orderedBy')} placeholder="Contact person" />
            </div>
            <div className="space-y-1.5">
              <Label>Material Ordered date</Label>
              <Input type="date" {...register('orderedDate')} />
            </div>
            <div className="space-y-1.5">
              <Label>Project name</Label>
              <Input {...register('projectName')} placeholder="e.g. Mexico" />
            </div>
            <div className="space-y-1.5">
              <Label>Material Delivery date</Label>
              <Input {...register('deliveryTime')} placeholder="e.g. 15 day's" />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Terms</Label>
              <Input {...register('paymentTerms')} placeholder={settings?.defaultPaymentTerms} />
            </div>
            <div className="space-y-1.5">
              <Label>Validity Period</Label>
              <Input {...register('validityPeriod')} placeholder={`${settings?.defaultValidityDays ?? 15} days`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Items</CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => append({ ...EMPTY_AREA_ITEM })}>
                <Plus className="h-4 w-4" /> Cut stone
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ ...EMPTY_LINEAR_ITEM })}>
                <Ruler className="h-4 w-4" /> Edge work
              </Button>
            </div>
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
                meta={meta}
                currency={currency}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Totals & Remarks</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Discount ({currency})</Label>
                    <Input type="number" step="0.01" min="0" {...register('discount')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>VAT</Label>
                    <Select {...register('vatRate')}>
                      <option value={standardVat}>Apply VAT ({standardVat}%)</option>
                      <option value={0}>No VAT (0%) — exempt customer</option>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Total weight</Label>
                  <Input {...register('totalWeight')} placeholder="e.g. 50 Kuntal" />
                </div>
                <div className="space-y-1.5">
                  <Label>Remark</Label>
                  <Input {...register('remark')} placeholder="Shown under Remark on the proforma" />
                </div>
                <div className="space-y-1.5">
                  <Label>Internal notes</Label>
                  <Input {...register('notes')} placeholder="Optional" />
                </div>
              </div>
              <div className="h-fit space-y-1 rounded-lg bg-muted p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-medium">{formatMoney(subtotal, currency)}</span>
                </div>
                {cappedDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium">- {formatMoney(cappedDiscount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{vatRate}% VAT</span>
                  <span className="font-medium">{formatMoney(vatAmount, currency)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
                  <span>Total incl. VAT</span>
                  <span>{formatMoney(grandTotal, currency)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {allDirect && !isEdit && (
          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <Zap className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Every item is a pre-approved product, so this proforma will be approved
              immediately on submission — no supervisor or admin review needed.
            </p>
          </div>
        )}

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
            {!isEdit
              ? 'Create & submit for approval'
              : lockedStatus ? 'Save changes' : 'Save & submit for approval'}
          </Button>
        </div>
      </form>
    </div>
  )
}
