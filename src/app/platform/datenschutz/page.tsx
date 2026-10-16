import type { Metadata } from 'next'
import { legalContext } from '@/lib/legal/context'
import { datenschutzPlattform } from '@/lib/legal/templates/plattform'
import { LegalDocument } from '@/components/legal-document'

export const metadata: Metadata = { title: 'Datenschutzerklärung' }

export default function Page() {
  return <LegalDocument template={datenschutzPlattform} context={legalContext()} />
}
