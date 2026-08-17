import { useState } from 'react'
import {
  History, CheckCircle2, XCircle, Factory, ArrowRightLeft, Undo2, Send, MessageSquarePlus,
} from 'lucide-react'
import { useList } from '@/hooks/useCrud'
import { PageHeader } from '@/components/shared/PageHeader'
import { Pagination } from '@/components/shared/Pagination'
import { EmptyState, ErrorState } from '@/components/shared/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// action slug -> icon + tone (Tailwind text color)
const META = {
  'proforma.approved': { icon: CheckCircle2, color: 'text-green-600' },
  'proforma.rejected': { icon: XCircle, color: 'text-red-600' },
  'order.sent_to_factory': { icon: Send, color: 'text-primary' },
  'order.step_requested': { icon: MessageSquarePlus, color: 'text-amber-600' },
  'order.step_moved': { icon: ArrowRightLeft, color: 'text-blue-600' },
  'order.step_reverted': { icon: Undo2, color: 'text-amber-700' },
  'order.step_request_rejected': { icon: XCircle, color: 'text-red-600' },
}

function timeAgo(iso) {
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ActivityLogPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useList('activity', '/activity', { page })
  const items = data?.activity || []

  return (
    <div>
      <PageHeader title="Activity log" description="Everything happening across proformas and the factory." />

      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState icon={History} title="No activity yet" />
        ) : (
          <ul className="divide-y">
            {items.map((a) => {
              const meta = META[a.action] || { icon: History, color: 'text-muted-foreground' }
              const Icon = meta.icon
              return (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{a.summary || a.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.actor?.name ? `${a.actor.name} · ` : ''}{timeAgo(a.createdAt)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <Pagination pagination={data?.pagination} onPageChange={setPage} />
      </Card>
    </div>
  )
}
