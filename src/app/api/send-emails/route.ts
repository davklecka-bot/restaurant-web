import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getPendingEmails, markEmailSent } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const EMAIL_TEMPLATE = (restaurantName: string) => ({
  subject: `Dotaz ohledně rezervačního systému – ${restaurantName}`,
  html: `
    <p>Dobrý den,</p>
    <p>jmenuji se David Klečka a provádím průzkum trhu ohledně rezervačních systémů v českých restauracích.</p>
    <p>Zajímalo by mě:</p>
    <ol>
      <li>Jak dnes rezervace řešíte?</li>
      <li>Co vám na současném řešení nejvíc vadí?</li>
      <li>Zkoušeli jste online rezervační systémy?</li>
    </ol>
    <p>Odpověď zabere 2 minuty a velmi mi pomůže. Děkuji!</p>
    <p>S pozdravem,<br>David Klečka</p>
  `
})

export async function POST() {
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  if (!smtpUser || !smtpPass) {
    return NextResponse.json({ error: 'Chybí SMTP_USER nebo SMTP_PASS v env proměnných' }, { status: 400 })
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: smtpUser, pass: smtpPass }
  })

  const pending = await getPendingEmails()

  if (pending.length === 0) {
    return NextResponse.json({ sent: 0, message: 'Žádné emaily k odeslání' })
  }

  let sent = 0
  const errors: string[] = []

  for (const r of pending) {
    try {
      const { subject, html } = EMAIL_TEMPLATE(r.name)
      await transporter.sendMail({
        from: `David Klečka <${smtpUser}>`,
        to: r.email!,
        subject,
        html
      })
      await markEmailSent(r.outreach_id)
      sent++
      await new Promise(res => setTimeout(res, 500))
    } catch (e: any) {
      errors.push(`${r.name}: ${e.message}`)
    }
  }

  return NextResponse.json({ sent, total: pending.length, errors })
}
