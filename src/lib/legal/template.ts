// Minimaler, sicherer Template-Mechanismus für die Rechtstexte (Markdown):
//   {{pfad.zum.wert}}                   -> Wert (Markdown-Sonderzeichen werden maskiert)
//   {{#if pfad}} … {{else}} … {{/if}}   -> bedingter Abschnitt
//   {{#unless pfad}} … {{/unless}}      -> Abschnitt, wenn Wert leer/false
// Werte stammen teils aus Eingaben der Betriebe; durch das Maskieren können sie
// weder Formatierung noch Links einschleusen. Rohes HTML wird beim Rendern ohnehin
// nicht ausgeführt (react-markdown ohne rehype-raw).

export type TemplateContext = { [key: string]: unknown }

function lookup(context: TemplateContext, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (value && typeof value === 'object' && key in (value as object)) return (value as Record<string, unknown>)[key]
    return undefined
  }, context)
}

function truthy(value: unknown): boolean {
  if (typeof value === 'string') return value.trim() !== ''
  if (typeof value === 'number') return value !== 0
  return Boolean(value)
}

export function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]<>()#+!|~])/g, '\\$1').replace(/^(\s*)([-=]|\d+\.)/gm, '$1\\$2')
}

const BLOCK = /\{\{#(if|unless) ([\w.]+)\}\}((?:(?!\{\{#(?:if|unless) )[\s\S])*?)\{\{\/\1\}\}/

export function renderTemplate(template: string, context: TemplateContext, options: { missing?: 'empty' | 'placeholder' } = {}): string {
  let output = template
  // Innerste Blöcke zuerst auflösen, bis keine mehr übrig sind (erlaubt Verschachtelung)
  for (let guard = 0; guard < 500; guard++) {
    const match = output.match(BLOCK)
    if (!match || match.index === undefined) break
    const [whole, kind, path, body] = match
    const [whenTrue, whenFalse = ''] = body.split('{{else}}')
    const condition = truthy(lookup(context, path))
    const chosen = kind === 'if' ? (condition ? whenTrue : whenFalse) : condition ? whenFalse : whenTrue
    output = output.slice(0, match.index) + chosen + output.slice(match.index + whole.length)
  }
  output = output.replace(/\{\{([\w.]+)\}\}/g, (_, path: string) => {
    const value = lookup(context, path)
    if (value === undefined || value === null || value === '') {
      return options.missing === 'placeholder' ? `[${path}]` : ''
    }
    return escapeMarkdown(String(value))
  })
  // Mehrfache Leerzeilen durch entfernte Abschnitte zusammenfassen
  return output.replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
