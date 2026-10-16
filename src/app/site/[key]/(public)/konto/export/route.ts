import { getCustomerContext } from '@/lib/auth/guards'
import { exportCustomerData } from '@/lib/privacy/export'
import { audit } from '@/lib/audit'

export async function GET() {
  const ctx = await getCustomerContext()
  if (!ctx) return new Response('Nicht angemeldet', { status: 401 })
  const data = await exportCustomerData(ctx.tenant, ctx.customer.id)
  await audit({ tenantId: ctx.tenant.id, actorType: 'CUSTOMER', actorId: ctx.customer.id, action: 'customer.exported', detail: 'Selbstauskunft' })
  return new Response(JSON.stringify(data, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="meine-daten.json"', 'Cache-Control': 'no-store' },
  })
}
