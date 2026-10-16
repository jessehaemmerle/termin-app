import type { Metadata } from 'next'
import { legalContext } from '@/lib/legal/context'
import { impressumPlattform } from '@/lib/legal/templates/impressum'
import { LegalDocument } from '@/components/legal-document'

export const metadata: Metadata = { title: 'Impressum' }

export default function Page() {
  return <LegalDocument template={impressumPlattform} context={legalContext()} />
}
