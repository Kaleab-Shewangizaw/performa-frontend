import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import { api } from '@/lib/api'
import { useSettings } from '@/hooks/useCrud'
import { formatMoney } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState, EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// Validated against light surface (dataviz palette checks): #3b82f6
const BAR_COLOR = '#3b82f6'

function RevenueChart({ data, currency }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(...data.map((d) => d.revenue), 1)

  return (
    <div>
      <div
        className="flex h-56 items-end gap-2 rounded-md px-2"
        role="img"
        aria-label="Monthly approved revenue bar chart"
      >
        {data.map((d, i) => {
          const h = Math.max(4, (d.revenue / max) * 100)
          const label = `${MONTHS[d.month - 1]} ${d.year}`
          return (
            <div
              key={`${d.year}-${d.month}`}
              className="relative flex h-full max-w-24 flex-1 cursor-pointer flex-col justify-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {hover === i && (
                <div className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border bg-card px-2.5 py-1.5 text-xs shadow-md">
                  <p className="font-medium">{label}</p>
                  <p className="text-muted-foreground">{formatMoney(d.revenue, currency)} · {d.count} proformas</p>
                </div>
              )}
              <div
                className="rounded-t-[4px] transition-opacity"
                style={{
                  height: `${h}%`,
                  backgroundColor: BAR_COLOR,
                  opacity: hover === null || hover === i ? 1 : 0.45,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex gap-2 px-2">
        {data.map((d) => (
          <p key={`${d.year}-${d.month}`} className="max-w-24 flex-1 truncate text-center text-xs text-muted-foreground">
            {MONTHS[d.month - 1]}
          </p>
        ))}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const { data: settings } = useSettings()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => api.get('/dashboard/admin').then((r) => r.data),
  })

  const currency = settings?.currency || 'ETB'

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>
  }
  if (isError) return <ErrorState onRetry={refetch} />

  const monthly = data?.monthlyRevenue || []
  const stats = data?.stats
  const approvalRate =
    stats.approved + stats.rejected > 0
      ? Math.round((stats.approved / (stats.approved + stats.rejected)) * 100)
      : null

  return (
    <div className="w-full">
      <PageHeader title="Reports" description="Revenue and approval analytics from approved proformas" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Approved Revenue</p>
            <p className="text-2xl font-bold">{formatMoney(stats.revenue, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Approval Rate</p>
            <p className="text-2xl font-bold">{approvalRate === null ? '—' : `${approvalRate}%`}</p>
            <p className="text-xs text-muted-foreground">{stats.approved} approved · {stats.rejected} rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">In Pipeline</p>
            <p className="text-2xl font-bold">{stats.pending + stats.supervisorApproved}</p>
            <p className="text-xs text-muted-foreground">{stats.pending} pending · {stats.supervisorApproved} awaiting final</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Approved Revenue</CardTitle>
          <CardDescription>Grand totals of proformas that received final approval</CardDescription>
        </CardHeader>
        <CardContent>
          {monthly.length === 0 ? (
            <EmptyState icon={BarChart3} title="No approved proformas yet" />
          ) : (
            <>
              <RevenueChart data={monthly} currency={currency} />
              <div className="mt-6 border-t pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Proformas</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthly.map((m) => (
                      <TableRow key={`${m.year}-${m.month}`}>
                        <TableCell>{MONTHS[m.month - 1]} {m.year}</TableCell>
                        <TableCell className="text-right">{m.count}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(m.revenue, currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
