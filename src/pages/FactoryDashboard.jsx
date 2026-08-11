import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Factory, Layers, PackageCheck, ArrowRight } from 'lucide-react'
import { useList } from '@/hooks/useCrud'
import { formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function FactoryDashboardPage() {
  const navigate = useNavigate()
  // One page is plenty for a small factory; group client-side.
  const { data, isLoading, isError, refetch } = useList('orders', '/orders', { limit: 100 })
  const orders = data?.orders || []
  const total = data?.pagination?.total ?? orders.length

  const byStage = useMemo(() => {
    const map = new Map()
    for (const o of orders) {
      const name = o.currentStep?.name || 'Not started'
      map.set(name, (map.get(name) || 0) + 1)
    }
    return [...map.entries()]
  }, [orders])

  const recent = orders.slice(0, 6)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }
  if (isError) return <ErrorState onRetry={refetch} />

  return (
    <div className="space-y-6">
      <PageHeader title="Factory dashboard" description="Everything currently on the workshop floor." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Orders in production" value={total} icon={Factory} />
        <StatCard label="Active stages" value={byStage.length} icon={Layers} tone="info" />
        <StatCard
          label="At final stage"
          value={byStage.filter(([n]) => /deliver/i.test(n)).reduce((s, [, c]) => s + c, 0)}
          icon={PackageCheck}
          tone="success"
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Orders by stage</CardTitle></CardHeader>
        <CardContent>
          {byStage.length === 0 ? (
            <EmptyState icon={Factory} title="Nothing in production yet" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {byStage.map(([name, count]) => (
                <Badge key={name} variant="warning" className="px-3 py-1 text-sm">
                  {name} · {count}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent orders</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
            All orders <ArrowRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <EmptyState icon={Factory} title="No orders yet" />
          ) : (
            <ul className="divide-y">
              {recent.map((o) => (
                <li key={o.id}>
                  <button
                    onClick={() => navigate(`/orders/${o.id}`)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-accent cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{o.proformaNumber}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {o.customer?.fullName || '—'}{o.projectName ? ` · ${o.projectName}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="warning" className="shrink-0">{o.currentStep?.name || 'Not started'}</Badge>
                      <span className="hidden text-xs text-muted-foreground sm:inline">{formatDate(o.updatedAt)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
