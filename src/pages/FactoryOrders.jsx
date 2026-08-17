import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Factory, ArrowRight } from 'lucide-react'
import { useList } from '@/hooks/useCrud'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function FactoryOrdersPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useList('orders', '/orders', { page })
  const orders = data?.orders || []

  return (
    <div>
      <PageHeader
        title="Production"
        description="Orders sent to the factory. Open one to see what to make and update its stage."
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : isError ? (
        <Card><ErrorState onRetry={refetch} /></Card>
      ) : orders.length === 0 ? (
        <Card>
          <EmptyState icon={Factory} title="No orders in production" description="Orders appear here once they're sent to the factory." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {orders.map((o) => (
            <Card
              key={o.id}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => navigate(`/orders/${o.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold tracking-tight">{o.proformaNumber}</div>
                    {o.projectName && <div className="truncate text-sm text-muted-foreground">{o.projectName}</div>}
                  </div>
                  <Badge variant="warning" className="shrink-0">{o.currentStep?.name || 'Not started'}</Badge>
                </div>

                <dl className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Customer</dt>
                    <dd className="truncate text-right font-medium">{o.customer?.fullName || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Items</dt>
                    <dd className="text-right font-medium">{o.items?.length ?? 0}</dd>
                  </div>
                </dl>

                <Button className="mt-4 w-full" variant="outline" tabIndex={-1}>
                  View &amp; update <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Pagination pagination={data?.pagination} onPageChange={setPage} />
      </div>
    </div>
  )
}
