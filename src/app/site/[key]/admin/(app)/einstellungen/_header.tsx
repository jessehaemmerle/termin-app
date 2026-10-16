import Link from 'next/link'
import type { ReactNode } from 'react'
import { PageTitle } from '@/components/ui'

export function SettingsHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div>
      <Link href="/admin/einstellungen" className="text-sm">Einstellungen</Link>
      <div className="mt-2"><PageTitle title={title} description={description} /></div>
    </div>
  )
}
