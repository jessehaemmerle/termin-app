import Link from 'next/link'
import { requireTenant } from '@/lib/tenant'
import { hasLogo } from '@/lib/branding'
import { getCustomerContext } from '@/lib/auth/guards'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const tenant = await requireTenant()
  const [logo, customer] = await Promise.all([hasLogo(tenant.id), tenant.allowCustomerAccounts ? getCustomerContext() : null])
  const version = tenant.updatedAt.getTime()

  return (
    <div className="min-h-dvh flex flex-col">
      <a
        href="#inhalt"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:px-4 focus:py-2 focus:bg-surface focus:rounded"
      >
        Zum Inhalt springen
      </a>
      <header className="safe-top bg-surface border-b border-rule">
        <div className="mx-auto max-w-3xl px-4 min-h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 min-w-0 no-underline text-ink py-2">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element -- Logo kommt mandantenbezogen aus der eigenen Route
              <img src={`/assets/logo.png?v=${version}`} alt="" className="h-9 w-auto max-w-24 object-contain" />
            )}
            <span className="font-display font-semibold text-lg leading-tight truncate">{tenant.name}</span>
          </Link>
          {tenant.allowCustomerAccounts && (
            <nav aria-label="Konto">
              <Link href="/konto" className="inline-flex items-center min-h-11 px-3 rounded-[var(--radius-control)] font-semibold no-underline hover:bg-brand-soft">
                {customer ? 'Mein Konto' : 'Anmelden'}
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main id="inhalt" className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 md:py-10">
        {children}
      </main>

      <footer className="border-t border-rule bg-surface safe-bottom">
        <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-graphite space-y-3">
          <nav aria-label="Rechtliches">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              <li><Link href="/impressum">Impressum</Link></li>
              <li><Link href="/datenschutz">Datenschutz</Link></li>
              <li><Link href="/buchungsbedingungen">Buchungsbedingungen</Link></li>
              <li><Link href="/barrierefreiheit">Barrierefreiheit</Link></li>
            </ul>
          </nav>
          <p>Diese Seite verwendet ausschließlich technisch notwendige Cookies und kein Tracking.</p>
        </div>
      </footer>
    </div>
  )
}
