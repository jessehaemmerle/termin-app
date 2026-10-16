import { brandPalette } from '../color'

// E-Mail-Layout: schlichtes, barrierearmes HTML mit Textalternative.
// Alle Inhalte werden HTML-maskiert; Links nur als https/http/mailto/tel.

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeUrl(url: string): string {
  return /^(https?:|mailto:|tel:)/i.test(url) ? url : '#'
}

export type EmailBlock =
  | { type: 'p'; text: string }
  | { type: 'facts'; rows: [string, string][] }
  | { type: 'button'; label: string; url: string }
  | { type: 'small'; text: string }

export type EmailContent = {
  subject: string
  heading: string
  blocks: EmailBlock[]
  footer: string
}

export function renderEmail(content: EmailContent, brandColor: string): { subject: string; html: string; text: string } {
  const palette = brandPalette(brandColor)
  const htmlBlocks = content.blocks
    .map((b) => {
      switch (b.type) {
        case 'p':
          return `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#18202e">${escapeHtml(b.text)}</p>`
        case 'small':
          return `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#535e70">${escapeHtml(b.text)}</p>`
        case 'facts':
          return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 20px">${b.rows
            .map(
              ([k, v]) =>
                `<tr><td style="padding:8px 12px 8px 0;border-top:1px solid #dbe0e7;color:#535e70;font-size:14px;vertical-align:top;width:35%">${escapeHtml(k)}</td><td style="padding:8px 0;border-top:1px solid #dbe0e7;color:#18202e;font-size:15px;font-weight:600">${escapeHtml(v)}</td></tr>`,
            )
            .join('')}</table>`
        case 'button':
          return `<p style="margin:8px 0 24px"><a href="${escapeHtml(safeUrl(b.url))}" style="display:inline-block;background:${palette.brand};color:${palette.onBrand};text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px;font-size:16px">${escapeHtml(b.label)}</a></p>`
      }
    })
    .join('\n')

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(content.subject)}</title></head>
<body style="margin:0;background:#f3f5f8;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
<table role="presentation" style="width:100%;border-collapse:collapse"><tr><td style="padding:24px 12px">
<table role="presentation" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dbe0e7;border-radius:16px;border-collapse:separate">
<tr><td style="height:6px;background:${palette.brand};border-radius:16px 16px 0 0"></td></tr>
<tr><td style="padding:28px 28px 8px"><h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#18202e">${escapeHtml(content.heading)}</h1>
${htmlBlocks}
</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid #dbe0e7;font-size:12px;line-height:1.5;color:#535e70">${escapeHtml(content.footer).replace(/\n/g, '<br>')}</td></tr>
</table></td></tr></table></body></html>`

  const textBlocks = content.blocks
    .map((b) => {
      switch (b.type) {
        case 'p':
        case 'small':
          return b.text
        case 'facts':
          return b.rows.map(([k, v]) => `${k}: ${v}`).join('\n')
        case 'button':
          return `${b.label}: ${b.url}`
      }
    })
    .join('\n\n')

  return { subject: content.subject, html, text: `${content.heading}\n\n${textBlocks}\n\n--\n${content.footer}\n` }
}
