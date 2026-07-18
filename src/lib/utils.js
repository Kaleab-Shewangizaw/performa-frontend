import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatMoney(value, currency = 'ETB') {
  return `${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`
}

export function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending',
  supervisor_approved: 'Supervisor Approved',
  rejected: 'Rejected',
  approved: 'Approved',
}

export const ROLE_LABELS = {
  sales: 'Sales',
  supervisor: 'Supervisor',
  admin: 'Admin',
}
