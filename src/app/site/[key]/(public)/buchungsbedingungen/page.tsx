import type { Metadata } from 'next'
import { requireTenant } from '@/lib/tenant'
import { legalContext } from '@/lib/legal/context'
import { buchungsbedingungen } from '@/lib/legal/templates/buchungsbedingungen'
import { LegalDocument } from '@/components/legal-document'

export const metadata: Metadata = { title: 'Buchungsbedingungen' }

export default async function Page() {
  const tenant = await requireTenant()
  return <LegalDocument template={buchungsbedingungen} context={legalContext(tenant)} />
}
