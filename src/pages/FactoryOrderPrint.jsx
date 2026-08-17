import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'

function trim(n) {
  if (n === null || n === undefined) return '—'
  return String(Number(Number(n).toFixed(4)))
}

// A clean, no-pricing work sheet the factory can print for the floor. Rendered
// outside the app layout so only the order prints.
export default function FactoryOrderPrintPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data.order),
  })

  useEffect(() => {
    if (order) {
      const t = setTimeout(() => window.print(), 400)
      return () => clearTimeout(t)
    }
  }, [order])

  if (isLoading) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>
  if (isError || !order) return <div className="p-10 text-sm text-destructive">Order not found.</div>

  const c = order.customer || {}

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-black">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/orders/${id}`)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print
        </Button>
      </div>

      <div className="border-b-2 border-black pb-3">
        <h1 className="text-xl font-bold tracking-tight">SHRUBS MARBLE AND GRANITE PLC</h1>
        <p className="text-sm">Factory work order</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <p><b>Order:</b> {order.proformaNumber}</p>
        <p><b>Stage:</b> {order.currentStep?.name || '—'}</p>
        <p><b>Customer:</b> {c.fullName}</p>
        {c.phone && <p><b>Phone:</b> {c.phone}</p>}
        {order.projectName && <p><b>Project:</b> {order.projectName}</p>}
        {order.materialType && <p><b>Material:</b> {order.materialType}</p>}
        {order.orderedDate && <p><b>Ordered:</b> {formatDate(order.orderedDate)}</p>}
        {order.deliveryTime && <p><b>Delivery:</b> {order.deliveryTime}</p>}
        {(c.address || c.city) && (
          <p className="col-span-2"><b>Address:</b> {[c.address, c.city].filter(Boolean).join(', ')}</p>
        )}
      </div>

      <h2 className="mt-6 mb-2 text-sm font-bold uppercase tracking-wide">Items to produce</h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-black text-left">
            <th className="py-1 pr-2">#</th>
            <th className="py-1 pr-2">Description</th>
            <th className="py-1 pr-2 text-right">L×W (m)</th>
            <th className="py-1 pr-2 text-right">Thk (cm)</th>
            <th className="py-1 pr-2 text-right">Qty</th>
            <th className="py-1 pr-2 text-right">Area m²</th>
            <th className="py-1">Remark</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => {
            const isLinear = item.itemType === 'linear'
            return (
              <tr key={item.id} className="border-b border-gray-300 align-top">
                <td className="py-1.5 pr-2">{i + 1}</td>
                <td className="py-1.5 pr-2">
                  <div className="font-medium">{item.description || item.productName}</div>
                  <div className="text-xs text-gray-600">
                    {[item.stoneColor, item.stoneCategory, item.finish].filter(Boolean).join(' · ')}
                  </div>
                </td>
                <td className="py-1.5 pr-2 text-right">{isLinear ? '—' : `${trim(item.length)}×${trim(item.width)}`}</td>
                <td className="py-1.5 pr-2 text-right">{isLinear || item.thickness == null ? '—' : item.thickness / 10}</td>
                <td className="py-1.5 pr-2 text-right">{isLinear ? '—' : item.quantity}</td>
                <td className="py-1.5 pr-2 text-right">{isLinear ? '—' : trim(item.area)}</td>
                <td className="py-1.5">{item.remark || (isLinear ? 'per linear m' : '')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mt-10 grid grid-cols-2 gap-8 text-sm print:mt-16">
        <div className="border-t border-black pt-1">Prepared by</div>
        <div className="border-t border-black pt-1">Checked by</div>
      </div>
    </div>
  )
}
