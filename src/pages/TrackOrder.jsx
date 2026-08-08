import { useState } from 'react'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { Mountain, Search, Check, PackageSearch, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

// This page is public and lives on its own subdomain (customer.shrubsmarble.com),
// so it calls the API directly rather than through the authenticated `api`
// client. In dev, Vite proxies /api -> localhost:3000; in production set
// VITE_TRACK_API_BASE to the API's public URL (e.g. https://app.shrubsmarble.com/api).
const API_BASE = (import.meta.env.VITE_TRACK_API_BASE || '/api').replace(/\/+$/, '')

const SMG_ORANGE = '#f7941d'

function formatWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function Stage({ step, isLast }) {
  const state = step.current ? 'current' : step.reached ? 'done' : 'upcoming'
  return (
    <li className="relative pb-7 pl-10 last:pb-0">
      {!isLast && (
        <span
          className={cn(
            'absolute left-[11px] top-6 bottom-0 w-0.5',
            state === 'done' ? 'bg-primary' : 'bg-border'
          )}
        />
      )}
      <span
        className={cn(
          'absolute left-0 top-0.5 grid h-6 w-6 place-items-center rounded-full border-2 transition-colors',
          state === 'current' && 'border-transparent text-white',
          state === 'done' && 'border-primary bg-primary text-white',
          state === 'upcoming' && 'border-border bg-card'
        )}
        style={state === 'current' ? { backgroundColor: SMG_ORANGE } : undefined}
      >
        {state === 'done' && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        {state === 'current' && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>

      <div className={cn('font-medium leading-6', state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground')}>
        {step.name}
      </div>
      {state === 'current' && (
        <div className="mt-0.5 text-xs font-semibold uppercase tracking-wider" style={{ color: '#b9700c' }}>
          In progress now
        </div>
      )}
      {state === 'done' && step.reachedAt && (
        <div className="mt-0.5 text-xs text-muted-foreground">{formatWhen(step.reachedAt)}</div>
      )}
    </li>
  )
}

function ResultCard({ t }) {
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <div className="text-lg font-semibold tracking-tight">Order {t.proformaNumber}</div>
          {t.projectName && <div className="text-sm text-muted-foreground">{t.projectName}</div>}
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold',
            t.inProduction
              ? 'border-[#f7941d]/40 bg-[#f7941d]/10 text-[#b9700c]'
              : 'border-primary/25 bg-primary/5 text-primary'
          )}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: t.inProduction ? SMG_ORANGE : 'var(--color-primary)' }}
          />
          {t.status}
        </span>
      </div>

      {!t.inProduction && (
        <p className="px-5 pt-4 text-sm text-muted-foreground">
          Your order has been received and is being reviewed. Tracking will begin as soon as it
          enters the workshop.
        </p>
      )}

      <CardContent className="p-5 pt-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Fabrication journey
        </p>
        <ol>
          {(t.steps || []).map((s, i) => (
            <Stage key={s.name + i} step={s} isLast={i === t.steps.length - 1} />
          ))}
        </ol>
        {t.updatedAt && (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Last updated {formatWhen(t.updatedAt)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

const MESSAGES = {
  notfound: {
    icon: PackageSearch,
    title: "We couldn't find that order",
    body: 'No order matches that number and phone. Check both against your proforma and try again.',
  },
  ratelimited: {
    icon: Clock,
    title: 'Too many attempts',
    body: 'Please wait about a minute, then try again.',
  },
  error: {
    icon: AlertCircle,
    title: 'Something went wrong',
    body: 'We could not check your order just now. Please try again in a moment.',
  },
}

export default function TrackOrderPage() {
  const { register, handleSubmit } = useForm()
  const [status, setStatus] = useState('idle') // idle | loading | done | notfound | ratelimited | error
  const [tracking, setTracking] = useState(null)

  const onSubmit = async ({ number, phone }) => {
    if (!number?.trim() || !phone?.trim()) return
    setStatus('loading')
    setTracking(null)
    try {
      const res = await axios.post(`${API_BASE}/track`, {
        number: number.trim(),
        phone: phone.trim(),
      })
      setTracking(res.data.tracking)
      setStatus('done')
    } catch (err) {
      const code = err?.response?.status
      setStatus(code === 404 ? 'notfound' : code === 429 ? 'ratelimited' : 'error')
    }
  }

  const message = MESSAGES[status]

  return (
    <div className="min-h-screen bg-background">
      {/* Header band */}
      <header className="bg-[#152a45] text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ backgroundColor: SMG_ORANGE }}>
            <Mountain className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold">Shrubs Marble &amp; Granite</div>
            <div className="text-xs uppercase tracking-[0.16em] text-white/60">Order tracking</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-16">
        <div className="pt-10 pb-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Follow your order from cut to delivery
          </h1>
          <p className="mt-2 max-w-prose text-muted-foreground">
            Enter your order number and the phone number on your proforma to see exactly where
            your stone is in our workshop.
          </p>
        </div>

        <Card className="mt-5">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="number">Order number</Label>
                <Input id="number" placeholder="SMG-2026-0001" autoComplete="off" {...register('number', { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" type="tel" placeholder="09xx xxx xxx" autoComplete="tel" {...register('phone', { required: true })} />
              </div>
              <Button type="submit" loading={status === 'loading'} className="sm:h-9">
                {status !== 'loading' && <Search className="h-4 w-4" />}
                Track order
              </Button>
            </form>
          </CardContent>
        </Card>

        {status === 'done' && tracking && <ResultCard t={tracking} />}

        {message && (
          <Card className="mt-6 border-l-4" style={{ borderLeftColor: status === 'notfound' ? 'var(--color-destructive)' : 'var(--color-warning)' }}>
            <CardContent className="flex gap-3 p-5">
              <message.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <div className="font-semibold">{message.title}</div>
                <p className="mt-0.5 text-sm text-muted-foreground">{message.body}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="border-t border-border bg-secondary">
        <div className="mx-auto flex max-w-2xl flex-wrap items-start justify-between gap-4 px-5 py-6 text-sm">
          <div>
            <div className="font-semibold">SHRUBS MARBLE AND GRANITE PLC</div>
            <div className="text-muted-foreground">Addis Ababa, Ethiopia</div>
          </div>
          <div className="text-muted-foreground sm:text-right">
            <div><span className="font-medium text-foreground">Sales</span> · 0935 402 376 · 0935 402 315</div>
            <div><span className="font-medium text-foreground">Office</span> · 011 667 0153</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
