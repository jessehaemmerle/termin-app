import { expect, test } from '@playwright/test'
import { bookFirstSlot, staffLogin, tenant } from './helpers'

test.describe('Online-Buchung', () => {
  test('Kund:in bucht einen Termin und sagt ihn über den Verwaltungslink wieder ab', async ({ page }) => {
    await bookFirstSlot(page, 'mayer', /Herrenhaarschnitt/, { name: 'Maria Muster', email: 'maria@example.com' })
    await page.getByRole('button', { name: 'Termin verbindlich buchen' }).click()
    await expect(page).toHaveURL(/\/termin\/[A-Za-z0-9_-]+\?neu=1/)
    await expect(page.getByText('Ihr Termin ist gebucht')).toBeVisible()
    await expect(page.getByText('Bestätigt')).toBeVisible()

    // Kulanzfrist: direkt nach der Buchung ist eine Absage immer möglich
    await page.getByRole('link', { name: 'Termin absagen' }).click()
    await page.getByRole('button', { name: 'Ja, Termin absagen' }).click()
    await expect(page.getByText('Der Termin ist abgesagt')).toBeVisible()
    await expect(page.getByText('Vom Kunden abgesagt')).toBeVisible()
  })

  test('ungültige Telefonnummer wird verständlich gemeldet', async ({ page }) => {
    await bookFirstSlot(page, 'mayer', /Herrenhaarschnitt/, { name: 'Max Test', email: 'max@example.com', phone: '123' })
    await page.getByRole('button', { name: 'Termin verbindlich buchen' }).click()
    await expect(page.locator('form [role="alert"]')).toContainText('gültige Telefonnummer')
  })

  test('Anfrage mit Freigabe: Werkstatt bestätigt im Verwaltungsbereich', async ({ page, browser }, testInfo) => {
    // eigene Kundin je Projekt, da mobil und Desktop parallel laufen
    const name = `Erika Fahrer ${testInfo.project.name}`
    await bookFirstSlot(page, 'huber', /Reifenwechsel/, { name, email: `erika-${testInfo.project.name}@example.com`, phone: '0664 7654321' })
    await page.getByRole('button', { name: 'Terminanfrage senden' }).click()
    await expect(page.getByText('Ihre Anfrage ist eingegangen')).toBeVisible()
    await expect(page.getByText('Anfrage offen')).toBeVisible()

    const admin = await browser.newPage()
    await staffLogin(admin, 'huber', 'chef@huber.example')
    await expect(admin.getByRole('heading', { name: /Offene Anfragen/ })).toBeVisible()
    const request = admin.getByRole('listitem').filter({ hasText: name })
    await request.getByRole('button', { name: 'Bestätigen' }).click()
    // Nicht mehr offen (liegt der Termin auf heute, steht er danach im Terminbuch)
    await expect(request.getByRole('button', { name: 'Bestätigen' })).toHaveCount(0)
    await admin.close()

    await page.reload()
    await expect(page.getByText('Bestätigt')).toBeVisible()
  })

  test('Kurstermin buchen', async ({ page }, testInfo) => {
    await page.goto(tenant('mayer', '/kurse'))
    await page.getByRole('link', { name: /Workshop Hochsteckfrisuren/ }).first().click()
    await page.getByLabel('Name').fill('Kurs Teilnehmerin')
    await page.getByLabel('E-Mail-Adresse').fill(`kurs-${testInfo.project.name}@example.com`)
    await page.waitForTimeout(2100)
    await page.getByRole('button', { name: 'Platz verbindlich buchen' }).click()
    await expect(page.getByText('Ihr Termin ist gebucht')).toBeVisible()
  })
})
