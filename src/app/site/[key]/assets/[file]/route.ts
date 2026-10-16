import { NextResponse } from 'next/server'
import { currentTenant } from '@/lib/tenant'
import { ASSET_FILES, getAsset } from '@/lib/branding'

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const kind = ASSET_FILES[file]
  const tenant = await currentTenant()
  if (!kind || !tenant) return new NextResponse('Nicht gefunden', { status: 404 })
  const asset = await getAsset(tenant, kind)
  if (!asset) return new NextResponse('Nicht gefunden', { status: 404 })
  return new NextResponse(new Uint8Array(asset.data), {
    headers: {
      'Content-Type': asset.mime,
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  })
}
