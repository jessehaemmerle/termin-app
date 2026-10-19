import { db } from './db'
import { logError } from './log'

export type AuditEntry = {
  tenantId?: string | null
  actorType: 'USER' | 'CUSTOMER' | 'SYSTEM' | 'PLATFORM_ADMIN'
  actorId?: string | null
  action: string
  entityType?: string
  entityId?: string
  detail?: string
}

/** Protokolliert sicherheits- und datenschutzrelevante Aktionen (ohne Inhalte, ohne IP). */
export async function audit(entry: AuditEntry) {
  try {
    await db.auditLog.create({
      data: {
        tenantId: entry.tenantId ?? null,
        actorType: entry.actorType,
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        detail: entry.detail?.slice(0, 500),
      },
    })
  } catch (error) {
    logError('Audit-Log konnte nicht geschrieben werden', error)
  }
}

export const AUDIT_LABELS: Record<string, string> = {
  'auth.login': 'Anmeldung',
  'auth.login_failed': 'Fehlgeschlagene Anmeldung',
  'auth.logout': 'Abmeldung',
  'auth.password_changed': 'Passwort geändert',
  'auth.password_reset': 'Passwort zurückgesetzt',
  'auth.2fa_enabled': 'Zwei-Faktor-Anmeldung aktiviert',
  'auth.2fa_disabled': 'Zwei-Faktor-Anmeldung deaktiviert',
  'auth.sessions_revoked': 'Alle Geräte abgemeldet',
  'booking.created': 'Termin angelegt',
  'booking.status': 'Terminstatus geändert',
  'booking.rescheduled': 'Termin verschoben',
  'customer.updated': 'Kundendaten geändert',
  'customer.exported': 'Kundendaten exportiert (Auskunft)',
  'customer.erased': 'Kundendaten gelöscht',
  'customer.consent': 'Einwilligung geändert',
  'settings.updated': 'Einstellungen geändert',
  'settings.whatsapp': 'WhatsApp-Einstellungen geändert',
  'settings.smtp': 'E-Mail-Einstellungen geändert',
  'settings.domain': 'Domain geändert',
  'dpa.accepted': 'Auftragsverarbeitungsvertrag akzeptiert',
  'team.invited': 'Teammitglied eingeladen',
  'team.updated': 'Teammitglied geändert',
  'tenant.created': 'Betrieb angelegt',
  'tenant.status': 'Betriebsstatus geändert',
  'retention.run': 'Automatische Löschung durchgeführt',
}
