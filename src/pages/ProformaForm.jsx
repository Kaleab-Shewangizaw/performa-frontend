import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2, ArrowLeft, Zap } from 'lucide-react'
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

const EMPTY_ITEM = {
  description: '', length: '', width: '', thickness: '',
  quantity: 1, unitPrice: '', remark: '',
}

// Column widths shared by the header strip and every item row, so the grid
// lines up like a spreadsheet.
const GRID =
  'grid grid-cols-1 gap-2 md:grid-cols-[minmax(130px,1.7fr)_minmax(62px,0.7fr)_minmax(62px,0.7fr)_minmax(64px,0.7fr)_minmax(72px,0.8fr)_minmax(52px,0.5fr)_minmax(76px,0.8fr)_minmax(88px,1fr)_minmax(96px,1.05fr)_minmax(110px,1.2fr)_32px] md:items-center md:gap-1.5'

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// Mirrors the server: a line with no width is edge work billed per metre.
function computeItem(item, product) {
  const quantity = num(item?.quantity) || 0
  const totalLength = num(item?.length) * quantity
  const isLinear = item?.width === '' || item?.width == null || num(item?.width) === 0
  const area = isLinear ? 0 : num(item?.length) * num(item?.width) * quantity
  const unitPrice =
    item?.unitPrice !== '' && item?.unitPrice != null
      ? num(item.unitPrice)
      : (product?.defaultUnitPrice ?? 0)
  const lineTotal = (isLinear ? totalLength : area) * unitPrice
  return { isLinear, totalLength, area, unitPrice, lineTotal }
}

// Measurements show at natural precision (0.868, not 0.87).
function trim(n, dp = 4) {
  if (!n) return '—'
  return String(Number(Number(n).toFixed(dp)))
}

function ItemsHeader() {
  const cell = 'px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'
  return (
    <div className={`${GRID} hidden border-b pb-1.5 md:grid`}>
      <div className={cell}>Description</div>
      <div className={`${cell} text-right`}>Length (m)</div>
      <div className={`${cell} text-right`}>Width (m)</div>
      <div className={`${cell} text-right`}>Thk (cm)</div>
      <div className={`${cell} text-right`}>Tot. Len (m)</div>
      <div className={`${cell} text-right`}>Qty</div>
      <div className={`${cell} text-right`}>Tot. Area (m²)</div>
      <div className={`${cell} text-right`}>Unit Price</div>
      <div className={`${cell} text-right`}>Amount</div>
      <div className={cell}>Remark</div>
      <div />
    </div>
  )
}

function ItemRow({ index, control, register, remove, materialProduct, setValue, meta, canRemove }) {
  const item = useWatch({ control, name: `items.${index}` })
  const { isLinear, totalLength, area, lineTotal } = computeItem(item, materialProduct)

  // Prefill the material's usual thickness on a blank row; never overwrite a
  // value the user typed, since any thickness is allowed.
  useEffect(() => {
    if (!materialProduct || isLinear) return
    if (item?.thickness === '' || item?.thickness == null) {
      setValue(`items.${index}.thickness`, materialProduct.thicknessOptions[0] / 10)
    }
  }, [materialProduct, isLinear, item?.thickness, index, setValue])

  const mobileLabel = 'text-xs text-muted-foreground md:hidden'
  const readOnly =
    'flex h-9 items-center justify-end rounded-md bg-muted px-2 text-sm font-medium tabular-nums'
  const thicknesses = materialProduct?.thicknessOptions || meta?.thicknessOptions || []

  return (
    <div className={`${GRID} rounded-md border p-2 md:border-0 md:border-b md:p-0 md:pb-1.5`}>
      <div>
        <span className={mobileLabel}>Description</span>
        <Input
          list="element-types"
          placeholder="Window sill"
          className="h-9"
          {...register(`items.${index}.description`, { required: true })}
        />
      </div>

      <div>
        <span className={mobileLabel}>Length (m)</span>
        <Input type="number" step="0.001" min="0.001" className="h-9 text-right"
          {...register(`items.${index}.length`, { required: true })} />
      </div>

      <div>
        <span className={mobileLabel}>Width (m)</span>
        <Input type="number" step="0.001" min="0" placeholder="—" className="h-9 text-right"
          title="Leave empty for edge work priced per linear metre"
          {...register(`items.${index}.width`)} />
      </div>

      <div>
        <span className={mobileLabel}>Thickness (cm)</span>
        <Input
          type="number" step="0.1" min="0" placeholder="—"
          className="h-9 px-1.5 text-right"
          list={`thk-${index}`}
          disabled={isLinear}
          title="Any thickness in centimetres; the material's usual sizes are suggested"
          {...register(`items.${index}.thickness`)}
        />
        <datalist id={`thk-${index}`}>
          {thicknesses.map((t) => <option key={t} value={t / 10} />)}
        </datalist>
      </div>

      <div>
        <span className={mobileLabel}>Total Length (m)</span>
        <div className={readOnly}>{trim(totalLength, 3)}</div>
      </div>

      <div>
        <span className={mobileLabel}>Quantity</span>
        <Input type="number" min="1" step="1" className="h-9 px-1.5 text-right"
          {...register(`items.${index}.quantity`, { required: true })} />
      </div>

      <div>
        <span className={mobileLabel}>Total Area (m²)</span>
        <div className={readOnly}>{isLinear ? '—' : trim(area)}</div>
      </div>

      <div>
        <span className={mobileLabel}>Unit Price</span>
        <Input type="number" step="0.01" min="0" className="h-9 text-right"
          {...register(`items.${index}.unitPrice`, { required: true })} />
      </div>

      <div>
        <span className={mobileLabel}>Amount</span>
        <div className={`${readOnly} font-semibold`}>
          {lineTotal ? lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
        </div>
      </div>

      <div>
        <span className={mobileLabel}>Remark</span>
        <Input placeholder="Bullnose and Groove" className="h-9"
          {...register(`items.${index}.remark`)} />
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="icon" className="h-9 w-8"
          disabled={!canRemove} onClick={() => remove(index)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
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
        materialProductId: existing.items.find((i) => i.product)?.product ?? '',
        orderNumber: existing.orderNumber || '',
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
          description: i.description || '',
          length: i.length,
          width: i.width ?? '',
          // Stored in mm, edited in cm.
          thickness: i.thickness != null ? i.thickness / 10 : '',
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          remark: i.remark || '',
        })),
      }
    : {
        customerId: '', materialProductId: '', orderNumber: '', orderedBy: '', orderedDate: '',
        projectName: '', discount: 0, vatRate: standardVat, paymentTerms: '', deliveryTime: '',
        validityPeriod: '', totalWeight: '', remark: '', notes: '',
        items: [{ ...EMPTY_ITEM }],
      }

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm({
    values: defaultValues,
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = useWatch({ control, name: 'items' }) || []
  const materialProductId = useWatch({ control, name: 'materialProductId' })
  const materialProduct = products.find((p) => sameId(p.id, materialProductId))
  const discount = num(useWatch({ control, name: 'discount' }))
  const vatRateRaw = useWatch({ control, name: 'vatRate' })
  // VAT is all-or-nothing: the company's standard rate, or waived.
  const vatRate = num(vatRateRaw) > 0 ? standardVat : 0

  const subtotal = watchedItems.reduce(
    (sum, item) => sum + computeItem(item, materialProduct).lineTotal,
    0
  )
  const cappedDiscount = Math.min(discount, subtotal)
  const vatAmount = (subtotal - cappedDiscount) * (vatRate / 100)
  const grandTotal = subtotal - cappedDiscount + vatAmount

  const mutation = useApiMutation({
    mutationFn: ({ asDraft, data }) => {
      const payload = {
        customerId: Number(data.customerId),
        materialProductId: data.materialProductId ? Number(data.materialProductId) : null,
        materialType: materialProduct?.name || '',
        orderNumber: data.orderNumber || '',
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
          const hasWidth = i.width !== '' && i.width != null && num(i.width) > 0
          return {
            description: i.description,
            length: num(i.length),
            width: hasWidth ? num(i.width) : null,
            // Entered in centimetres, sent in millimetres.
            thickness: !hasWidth || !i.thickness ? null : num(i.thickness) * 10,
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
  const allDirect = watchedItems.length > 0 && materialProduct?.allowsDirectApproval === true

  return (
    <div className="w-full">
      <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <PageHeader
        title={isEdit ? `Edit ${existing?.proformaNumber || 'Proforma'}` : 'New Proforma'}
        description="Total length, area and amount are calculated automatically"
      />

      {/* Description suggestions, shared by every row */}
      <datalist id="element-types">
        {[...(meta?.elementTypes || []), ...(meta?.linearServices || [])].map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

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
              <Label>Material Type *</Label>
              <Select
                {...register('materialProductId', {
                  required: 'Select the material',
                  onChange: (e) => {
                    // Default every blank price to the chosen stone's rate.
                    const prod = products.find((p) => sameId(p.id, e.target.value))
                    if (!prod) return
                    watchedItems.forEach((it, idx) => {
                      if (it?.unitPrice === '' || it?.unitPrice == null) {
                        setValue(`items.${idx}.unitPrice`, prod.defaultUnitPrice)
                      }
                    })
                  },
                })}
              >
                <option value="">Select material…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.stoneCategory} ({p.finish})
                  </option>
                ))}
              </Select>
              {errors.materialProductId && (
                <p className="text-xs text-destructive">{errors.materialProductId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Order No.</Label>
              <Input {...register('orderNumber')} placeholder="Customer's order reference" />
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
            <Button type="button" variant="outline" size="sm" onClick={() => append({ ...EMPTY_ITEM })}>
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <ItemsHeader />
            {fields.map((field, index) => (
              <ItemRow
                key={field.id}
                index={index}
                control={control}
                register={register}
                remove={remove}
                canRemove={fields.length > 1}
                materialProduct={materialProduct}
                setValue={setValue}
                meta={meta}
              />
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              Leave <b>Width</b> empty for edge work such as Bullnose or Groove — those lines are
              priced per linear metre of total length.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Totals &amp; Remarks</CardTitle></CardHeader>
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
              {materialProduct.name} is a pre-approved product, so this proforma will be approved
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
