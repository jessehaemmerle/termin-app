import type { Metadata } from 'next'
import { requireTenant } from '@/lib/tenant'
import { legalContext } from '@/lib/legal/context'
import { barrierefreiheit } from '@/lib/legal/templates/buchungsbedingungen'
import { LegalDocument } from '@/components/legal-document'

export const metadata: Metadata = { title: 'Barrierefreiheit' }

export default async function Page() {
  const tenant = await requireTenant()
  return <LegalDocument template={barrierefreiheit} context={legalContext(tenant)} />
}
