import { describe, expect, it } from 'vitest'
import { isValidSlug, parseTenantKey, resolveHost } from '@/lib/hosts'
import { brandPalette, contrastRatio } from '@/lib/color'
import { escapeMarkdown, renderTemplate } from '@/lib/legal/template'

describe('resolveHost', () => {
  const config = { platformHost: 'termin-app.at' }

  it('erkennt Plattform, Subdomains und eigene Domains', () => {
    expect(resolveHost('termin-app.at', config)).toEqual({ kind: 'platform' })
    expect(resolveHost('www.termin-app.at:443', config)).toEqual({ kind: 'platform' })
    expect(resolveHost('mayer.termin-app.at', config)).toEqual({ kind: 'tenant', key: 's-mayer' })
    expect(resolveHost('Termine.Friseur-Mayer.AT.', config)).toEqual({ kind: 'tenant', key: 'd-termine.friseur-mayer.at' })
  })

  it('lehnt verschachtelte, reservierte und ungültige Hosts ab', () => {
    expect(resolveHost('a.b.termin-app.at', config)).toBeNull()
    expect(resolveHost('admin.termin-app.at', config)).toBeNull()
    expect(resolveHost('[::1]', config)).toBeNull()
    expect(resolveHost('', config)).toBeNull()
    expect(resolveHost('bad_host!.at', config)).toBeNull()
  })

  it('ordnet in der Einzelinstanz jeden Host dem Betrieb zu', () => {
    expect(resolveHost('irgendwas.example', { ...config, singleTenantSlug: 'mayer' })).toEqual({ kind: 'tenant', key: 's-mayer' })
  })

  it('parst Schlüssel nur mit gültigen Werten', () => {
    expect(parseTenantKey('s-mayer')).toEqual({ kind: 'slug', value: 'mayer' })
    expect(parseTenantKey('d-termine.mayer.at')).toEqual({ kind: 'domain', value: 'termine.mayer.at' })
    expect(parseTenantKey('s-../etc')).toBeNull()
    expect(parseTenantKey('x-mayer')).toBeNull()
  })

  it('validiert Subdomains', () => {
    expect(isValidSlug('friseur-mayer')).toBe(true)
    expect(isValidSlug('-mayer')).toBe(false)
    expect(isValidSlug('www')).toBe(false)
  })
})

describe('brandPalette', () => {
  it('sichert Textkontrast von mindestens 4,5:1 auch bei hellen Markenfarben', () => {
    for (const color of ['#f2b705', '#7a3e65', '#00ff00', '#ffffff', '#1f5f8b', '#ffd1dc']) {
      const p = brandPalette(color)
      expect(contrastRatio(p.brandText, '#ffffff')).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(p.brandText, '#f3f5f8')).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(p.brandText, p.brandSoft)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(p.brand, p.onBrand)).toBeGreaterThanOrEqual(3)
    }
  })

  it('wählt dunkle Schrift auf gelber Markenfarbe', () => {
    expect(brandPalette('#f2b705').onBrand).toBe('#18202e')
    expect(brandPalette('#1f5f8b').onBrand).toBe('#ffffff')
  })

  it('fällt bei ungültigen Werten auf die Standardfarbe zurück', () => {
    expect(brandPalette('red;}body{display:none').brand).toBe('#1f5f8b')
  })
})

describe('renderTemplate', () => {
  it('ersetzt Werte und wertet Bedingungen inklusive else und Verschachtelung aus', () => {
    const t = '{{#if a}}A={{a}}{{#if b}} B{{/if}}{{else}}kein A{{/if}}|{{#unless c}}ohne C{{/unless}}'
    expect(renderTemplate(t, { a: 'x', b: true }).trim()).toBe('A=x B|ohne C')
    expect(renderTemplate(t, { a: '', c: 'y' }).trim()).toBe('kein A|')
  })

  it('maskiert Markdown in Werten (keine eingeschleusten Links oder Formatierungen)', () => {
    const out = renderTemplate('Name: {{name}}', { name: '[Klick](https://evil.example) <script>' })
    expect(out).not.toContain('](https://')
    expect(out).toContain('\\[Klick\\]')
    expect(escapeMarkdown('# Titel')).toBe('\\# Titel')
  })

  it('zeigt fehlende Werte optional als Platzhalter', () => {
    expect(renderTemplate('{{x.y}}', {}, { missing: 'placeholder' }).trim()).toBe('[x.y]')
  })
})
