// Markenfarben der Betriebe barrierefrei einsetzen (WCAG 2.1, Kontrast 4,5:1).

const HEX_RE = /^#([0-9a-f]{6})$/i

export function isHexColor(value: string): boolean {
  return HEX_RE.test(value)
}

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`
}

function channel(c: number) {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

function mix(hex: string, target: [number, number, number], amount: number): string {
  const [r, g, b] = toRgb(hex)
  return toHex([r + (target[0] - r) * amount, g + (target[1] - g) * amount, b + (target[2] - b) * amount])
}

const INK = '#18202e'
const WHITE = '#ffffff'
const PAPER = '#f3f5f8'

export type BrandPalette = {
  brand: string
  onBrand: string
  brandText: string
  brandSoft: string
  brandLine: string
}

/**
 * Leitet aus der Primärfarbe eines Betriebs eine lesbare Palette ab:
 * - onBrand: Textfarbe auf der Markenfarbe (weiß oder Tinte, je nach Kontrast)
 * - brandText: Markenfarbe abgedunkelt, bis sie als Text auf Weiß, Papier und
 *   Markentönung jeweils 4,5:1 erreicht
 */
export function brandPalette(primary: string): BrandPalette {
  const brand = isHexColor(primary) ? primary.toLowerCase() : '#1f5f8b'
  const onBrand = contrastRatio(brand, WHITE) >= contrastRatio(brand, INK) ? WHITE : INK

  const brandSoft = mix(brand, [255, 255, 255], 0.9)
  // Markenfarbe als Textfarbe muss auf allen verwendeten Hintergründen lesbar sein
  const backgrounds = [WHITE, PAPER, brandSoft]
  const readable = (color: string) => backgrounds.every((bg) => contrastRatio(color, bg) >= 4.5)
  let brandText = brand
  for (let step = 1; step <= 20 && !readable(brandText); step++) {
    brandText = mix(brand, [0, 0, 0], step * 0.05)
  }

  return {
    brand,
    onBrand,
    brandText,
    brandSoft,
    brandLine: mix(brand, [255, 255, 255], 0.65),
  }
}

export function brandCss(primary: string): string {
  const p = brandPalette(primary)
  return `:root{--brand:${p.brand};--on-brand:${p.onBrand};--brand-text:${p.brandText};--brand-soft:${p.brandSoft};--brand-line:${p.brandLine}}`
}
