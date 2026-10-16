import { requireStaff } from '@/lib/auth/guards'
import { exportCustomerData } from '@/lib/privacy/export'
import { audit } from '@/lib/audit'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff({ permission: 'customers.privacy' })
  const { id } = await params
  const data = await exportCustomerData(ctx.tenant, id)
  if (!data) return new Response('Nicht gefunden', { status: 404 })
  await audit({ tenantId: ctx.tenant.id, actorType: 'USER', actorId: ctx.user.id, action: 'customer.exported', entityType: 'Customer', entityId: id })
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="auskunft-${id}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
