import type { Metadata } from 'next'
import { requireTenant } from '@/lib/tenant'
import { legalContext } from '@/lib/legal/context'
import { datenschutzBetrieb } from '@/lib/legal/templates/datenschutz-betrieb'
import { LegalDocument } from '@/components/legal-document'

export const metadata: Metadata = { title: 'Datenschutzerklärung' }

export default async function Page() {
  const tenant = await requireTenant()
  return <LegalDocument template={datenschutzBetrieb} context={legalContext(tenant)} />
}
