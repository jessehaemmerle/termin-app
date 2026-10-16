import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { renderTemplate, type TemplateContext } from '@/lib/legal/template'

/** Rendert eine Markdown-Vorlage sicher (kein rohes HTML) als Rechtstext. */
export function LegalDocument({ template, context }: { template: string; context: TemplateContext }) {
  const markdown = renderTemplate(template, context)
  return (
    <article className="prose-legal">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mb-4">{children}</h1>,
          a: ({ href, children }) => {
            const external = href?.startsWith('http')
            return (
              <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                {children}
              </a>
            )
          },
        }}
      >
        {markdown}
      </Markdown>
    </article>
  )
}
