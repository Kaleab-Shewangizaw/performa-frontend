import { Badge } from '@/components/ui/badge'
import { STATUS_LABELS } from '@/lib/utils'

const VARIANTS = {
  draft: 'secondary',
  pending: 'warning',
  supervisor_approved: 'info',
  rejected: 'destructive',
  approved: 'success',
}

export function StatusBadge({ status }) {
  return <Badge variant={VARIANTS[status] || 'secondary'}>{STATUS_LABELS[status] || status}</Badge>
}
