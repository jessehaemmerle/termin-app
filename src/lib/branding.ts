import sharp from 'sharp'
import { db } from './db'
import { brandPalette } from './color'
import type { AssetKind, Tenant } from '@/generated/prisma/client'

export const MAX_LOGO_BYTES = 1024 * 1024

const ICON_SIZES: Record<Exclude<AssetKind, 'LOGO'>, number> = {
  ICON_192: 192,
  ICON_512: 512,
  ICON_MASKABLE: 512,
  APPLE_TOUCH: 180,
}

// Kalender-Symbol als Pfade (keine Schriftarten nötig, funktioniert in jedem Container)
function defaultIconSvg(size: number, background: string, foreground: string, maskable: boolean) {
  const pad = maskable ? size * 0.2 : size * 0.16
  const s = size - pad * 2
  const x = pad
  const y = pad
  const r = maskable ? 0 : size * 0.18
  const stroke = Math.max(2, s * 0.07)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${background}"/>
  <g fill="none" stroke="${foreground}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
    <rect x="${x + s * 0.08}" y="${y + s * 0.16}" width="${s * 0.84}" height="${s * 0.76}" rx="${s * 0.08}"/>
    <line x1="${x + s * 0.08}" y1="${y + s * 0.38}" x2="${x + s * 0.92}" y2="${y + s * 0.38}"/>
    <line x1="${x + s * 0.3}" y1="${y + s * 0.06}" x2="${x + s * 0.3}" y2="${y + s * 0.24}"/>
    <line x1="${x + s * 0.7}" y1="${y + s * 0.06}" x2="${x + s * 0.7}" y2="${y + s * 0.24}"/>
    <polyline points="${x + s * 0.32},${y + s * 0.64} ${x + s * 0.45},${y + s * 0.77} ${x + s * 0.7},${y + s * 0.52}"/>
  </g>
</svg>`
}

/** Prüft und normalisiert ein hochgeladenes Logo: nur PNG/JPEG/WebP, max. 512 px, Metadaten (EXIF/GPS) entfernt. */
export async function normalizeLogo(input: Buffer): Promise<Buffer> {
  if (input.length > MAX_LOGO_BYTES) throw new Error('Das Logo darf höchstens 1 MB groß sein.')
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>
  try {
    meta = await sharp(input).metadata()
  } catch {
    throw new Error('Die Datei ist kein gültiges Bild.')
  }
  if (!meta.format || !['png', 'jpeg', 'webp'].includes(meta.format)) {
    throw new Error('Bitte ein PNG-, JPEG- oder WebP-Bild hochladen.')
  }
  return sharp(input).rotate().resize(512, 512, { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer()
}

async function renderIcon(kind: Exclude<AssetKind, 'LOGO'>, primaryColor: string, logo: Buffer | null): Promise<Buffer> {
  const size = ICON_SIZES[kind]
  const maskable = kind === 'ICON_MASKABLE'
  const palette = brandPalette(primaryColor)
  if (!logo) {
    return sharp(Buffer.from(defaultIconSvg(size, palette.brand, palette.onBrand, maskable))).png().toBuffer()
  }
  const inner = Math.round(size * (maskable ? 0.6 : 0.82))
  const resized = await sharp(logo).resize(inner, inner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background: maskable ? palette.brandSoft : '#ffffff' } })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toBuffer()
}

/** Erzeugt alle PWA-Icons eines Betriebs neu (nach Logo- oder Farbänderung). */
export async function regenerateIcons(tenant: Pick<Tenant, 'id' | 'primaryColor'>) {
  const logo = await db.tenantAsset.findUnique({ where: { tenantId_kind: { tenantId: tenant.id, kind: 'LOGO' } } })
  const logoData = logo ? Buffer.from(logo.data) : null
  for (const kind of Object.keys(ICON_SIZES) as Exclude<AssetKind, 'LOGO'>[]) {
    const data = await renderIcon(kind, tenant.primaryColor, logoData)
    await db.tenantAsset.upsert({
      where: { tenantId_kind: { tenantId: tenant.id, kind } },
      create: { tenantId: tenant.id, kind, mime: 'image/png', data: new Uint8Array(data) },
      update: { mime: 'image/png', data: new Uint8Array(data) },
    })
  }
}

export async function getAsset(tenant: Pick<Tenant, 'id' | 'primaryColor'>, kind: AssetKind) {
  let asset = await db.tenantAsset.findUnique({ where: { tenantId_kind: { tenantId: tenant.id, kind } } })
  if (!asset && kind !== 'LOGO') {
    await regenerateIcons(tenant)
    asset = await db.tenantAsset.findUnique({ where: { tenantId_kind: { tenantId: tenant.id, kind } } })
  }
  return asset
}

export async function hasLogo(tenantId: string) {
  return (await db.tenantAsset.count({ where: { tenantId, kind: 'LOGO' } })) > 0
}

export const ASSET_FILES: Record<string, AssetKind> = {
  'logo.png': 'LOGO',
  'icon-192.png': 'ICON_192',
  'icon-512.png': 'ICON_512',
  'icon-maskable.png': 'ICON_MASKABLE',
  'apple-touch-icon.png': 'APPLE_TOUCH',
}
