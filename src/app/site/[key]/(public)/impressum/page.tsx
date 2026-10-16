import type { Metadata } from 'next'
import { requireTenant } from '@/lib/tenant'
import { legalContext } from '@/lib/legal/context'
import { impressumBetrieb } from '@/lib/legal/templates/impressum'
import { LegalDocument } from '@/components/legal-document'

export const metadata: Metadata = { title: 'Impressum' }

export default async function Page() {
  const tenant = await requireTenant()
  return <LegalDocument template={impressumBetrieb} context={legalContext(tenant)} />
}
