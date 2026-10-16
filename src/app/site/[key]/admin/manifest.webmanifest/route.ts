import { currentTenant } from '@/lib/tenant'
import { buildManifest, manifestResponse } from '@/lib/manifest'

export async function GET() {
  const tenant = await currentTenant()
  if (!tenant) return new Response('Nicht gefunden', { status: 404 })
  return manifestResponse(buildManifest(tenant, 'admin'))
}
