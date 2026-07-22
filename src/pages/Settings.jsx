import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useSettings, useApiMutation } from '@/hooks/useCrud'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const queryClient = useQueryClient()

  const { register, handleSubmit, setValue, watch } = useForm({ values: settings })
  const logoUrl = watch('logoUrl')

  // Logos are stored inline as data URLs so the PDF renderer needs no file store.
  const onLogoPick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 400_000) {
      toast.error('Logo is too large — please use an image under 400 KB')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => setValue('logoUrl', String(reader.result), { shouldDirty: true })
    reader.readAsDataURL(file)
  }

  const mutation = useApiMutation({
    mutationFn: (data) =>
      api.put('/settings', {
        ...data,
        defaultVatRate: Number(data.defaultVatRate),
        defaultValidityDays: Number(data.defaultValidityDays),
      }),
    successMessage: 'Settings saved',
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Company information and proforma defaults" />
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Shown on proforma headers and PDFs</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Company Name</Label>
              <Input {...register('companyName')} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Input {...register('companyAddress')} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input {...register('companyPhone')} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...register('companyEmail')} />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input {...register('companyWebsite')} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input {...register('currency')} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Company logo"
                    className="h-16 w-auto max-w-[160px] rounded border bg-white object-contain p-1"
                  />
                ) : (
                  <div className="flex h-16 w-24 items-center justify-center rounded border text-xs text-muted-foreground">
                    No logo
                  </div>
                )}
                <div className="space-y-1">
                  <Input type="file" accept="image/png,image/jpeg" onChange={onLogoPick} className="h-auto py-1.5" />
                  <p className="text-xs text-muted-foreground">
                    PNG or JPEG, ideally under 200 KB. Appears on the proforma PDF.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proforma Defaults</CardTitle>
            <CardDescription>Applied to new proformas unless overridden</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Proforma Number Prefix</Label>
              <Input {...register('proformaPrefix')} />
            </div>
            <div className="space-y-1.5">
              <Label>Default VAT Rate (%)</Label>
              <Input type="number" step="0.1" min="0" max="100" {...register('defaultVatRate')} />
            </div>
            <div className="space-y-1.5">
              <Label>Default Validity (days)</Label>
              <Input type="number" min="1" max="365" {...register('defaultValidityDays')} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Default Payment Terms</Label>
              <Input {...register('defaultPaymentTerms')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proforma Footer</CardTitle>
            <CardDescription>Printed at the bottom of every proforma — one item per line</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Terms and Conditions</Label>
              <Textarea
                rows={4}
                {...register('termsAndConditions')}
                placeholder={"50% advance payment\nValid for 15 days from the date of issue"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Our Products</Label>
              <Textarea
                rows={4}
                {...register('productsOffered')}
                placeholder={'Granite\nMarble\nLimestone'}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bank Details</Label>
              <Textarea rows={3} {...register('bankDetails')} placeholder="Bank name, account name, account number" />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" loading={mutation.isPending}>Save settings</Button>
      </form>
    </div>
  )
}
