import type { Metadata } from 'next'
import { legalContext } from '@/lib/legal/context'
import { nutzungsbedingungen } from '@/lib/legal/templates/plattform'
import { LegalDocument } from '@/components/legal-document'

export const metadata: Metadata = { title: 'Nutzungsbedingungen' }

export default function Page() {
  return <LegalDocument template={nutzungsbedingungen} context={legalContext()} />
}
