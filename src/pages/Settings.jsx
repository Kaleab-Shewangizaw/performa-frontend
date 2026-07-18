import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
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

  const { register, handleSubmit } = useForm({ values: settings })

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
              <Label>Logo (data URL or leave empty)</Label>
              <Textarea
                {...register('logoUrl')}
                placeholder="data:image/png;base64,..."
                className="font-mono text-xs"
              />
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

        <Button type="submit" loading={mutation.isPending}>Save settings</Button>
      </form>
    </div>
  )
}
