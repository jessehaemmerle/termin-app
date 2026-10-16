import { env } from '../env'
import { formatPhone } from '../phone'
import { platformUrl, tenantBaseUrl } from '../urls'
import { CANCEL_GRACE_MINUTES } from '../booking/service'
import type { Tenant } from '@/generated/prisma/client'
import type { TemplateContext } from './template'

/** Stand der Rechtstexte – bei inhaltlichen Änderungen anpassen. */
export const LEGAL_VERSION_DATE = '16. Oktober 2026'

export function operatorContext() {
  const e = env()
  return {
    name: e.OPERATOR_NAME,
    legalForm: e.OPERATOR_LEGAL_FORM,
    street: e.OPERATOR_STREET,
    postalCode: e.OPERATOR_POSTAL_CODE,
    city: e.OPERATOR_CITY,
    country: e.OPERATOR_COUNTRY,
    email: e.OPERATOR_EMAIL,
    phone: e.OPERATOR_PHONE,
    uidNumber: e.OPERATOR_UID,
    companyRegisterNumber: e.OPERATOR_COMPANY_REGISTER_NUMBER,
    companyRegisterCourt: e.OPERATOR_COMPANY_REGISTER_COURT,
    businessPurpose: e.OPERATOR_BUSINESS_PURPOSE,
    supervisoryAuthority: e.OPERATOR_SUPERVISORY_AUTHORITY,
    chamber: e.OPERATOR_CHAMBER,
    privacyEmail: e.OPERATOR_PRIVACY_EMAIL || e.OPERATOR_EMAIL,
  }
}

export function platformContext() {
  const e = env()
  return {
    name: e.PLATFORM_NAME,
    url: platformUrl('/'),
    hosting: e.HOSTING_PROVIDER,
    hostingLocation: e.HOSTING_LOCATION,
    mailProvider: e.MAIL_PROVIDER,
    operator: operatorContext(),
  }
}

export function tenantContext(tenant: Tenant) {
  return {
    name: tenant.name,
    url: tenantBaseUrl(tenant),
    legalName: tenant.legalName,
    legalForm: tenant.legalForm,
    street: tenant.street,
    postalCode: tenant.postalCode,
    city: tenant.city,
    country: tenant.country,
    phone: tenant.phone ? formatPhone(tenant.phone) : '',
    email: tenant.email,
    uidNumber: tenant.uidNumber,
    companyRegisterNumber: tenant.companyRegisterNumber,
    companyRegisterCourt: tenant.companyRegisterCourt,
    businessPurpose: tenant.businessPurpose,
    supervisoryAuthority: tenant.supervisoryAuthority,
    chamber: tenant.chamber,
    professionTitle: tenant.professionTitle,
    tradeRegulations: tenant.tradeRegulations,
    privacyEmail: tenant.privacyContactEmail || tenant.email,
    dpoName: tenant.dpoName,
    dpoEmail: tenant.dpoEmail,
    additionalTerms: tenant.additionalTerms,
    cancellationHours: String(tenant.cancellationDeadlineHours),
    cancelGraceMinutes: String(CANCEL_GRACE_MINUTES),
    retentionMonths: String(tenant.retentionMonths),
    reminderHours: tenant.reminderHoursBefore > 0 ? String(tenant.reminderHoursBefore) : '',
    whatsapp: tenant.whatsappEnabled,
    whatsappChat: !!tenant.whatsappDisplayNumber,
    ownSmtp: !!tenant.smtpHost,
    smtpProvider: tenant.smtpHost ?? '',
    accounts: tenant.allowCustomerAccounts,
    waitlist: tenant.waitlistEnabled,
    requireApproval: tenant.requireApproval,
    requirePhone: tenant.requirePhone,
  }
}

export function legalContext(tenant?: Tenant): TemplateContext {
  return {
    stand: LEGAL_VERSION_DATE,
    plattform: platformContext(),
    ...(tenant ? { betrieb: tenantContext(tenant) } : {}),
  }
}
