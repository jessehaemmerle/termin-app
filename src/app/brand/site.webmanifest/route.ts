import { env } from '@/lib/env'
import { platformPath } from '@/lib/tenant'

// Manifest der Plattform-Website (Betriebe haben eigene Manifeste).
export function GET() {
  const name = env().PLATFORM_NAME
  return Response.json(
    {
      name,
      short_name: name,
      start_url: platformPath('/'),
      display: 'standalone',
      background_color: '#f3f5f8',
      theme_color: '#12305f',
      icons: [
        { src: '/brand/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/brand/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' } },
  )
}
