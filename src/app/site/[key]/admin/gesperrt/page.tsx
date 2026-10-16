import { AdminAuthPage } from '../_components/auth-page'

export default function SuspendedPage() {
  return (
    <AdminAuthPage title="Zugang vorübergehend gesperrt">
      <p>Dieser Betrieb ist derzeit gesperrt. Bitte wende dich an den Plattformbetreiber.</p>
    </AdminAuthPage>
  )
}
