import nodemailer from 'nodemailer'
import { pool } from './db.js'

const required = (name: string) => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required to send authentication emails.`)
  return value
}

const port = Number(process.env.SMTP_PORT ?? '587')
const transport = nodemailer.createTransport({
  host: required('SMTP_HOST'),
  port,
  secure: port === 465,
  auth: { user: required('SMTP_USER'), pass: required('SMTP_PASSWORD') },
})

export type EmailCategory = 'authentication' | 'billing' | 'team' | 'product' | 'announcement'
export type EmailPreferences = { productUpdates: boolean; billingUpdates: boolean; teamUpdates: boolean; announcements: boolean }
const defaults: EmailPreferences = { productUpdates: true, billingUpdates: true, teamUpdates: true, announcements: true }

const textFromHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const preferenceColumn: Record<Exclude<EmailCategory, 'authentication'>, keyof EmailPreferences> = {
  billing: 'billingUpdates', team: 'teamUpdates', product: 'productUpdates', announcement: 'announcements',
}

export async function getEmailPreferences(userId: string): Promise<EmailPreferences> {
  const result = await pool.query<{ product_updates: boolean; billing_updates: boolean; team_updates: boolean; announcements: boolean }>(
    `select product_updates, billing_updates, team_updates, announcements from email_preference where user_id = $1`, [userId],
  )
  const row = result.rows[0]
  return row ? { productUpdates: row.product_updates, billingUpdates: row.billing_updates, teamUpdates: row.team_updates, announcements: row.announcements } : defaults
}

export async function updateEmailPreferences(userId: string, values: EmailPreferences) {
  await pool.query(`insert into email_preference (user_id, product_updates, billing_updates, team_updates, announcements, updated_at)
    values ($1, $2, $3, $4, $5, now()) on conflict (user_id) do update set product_updates = excluded.product_updates, billing_updates = excluded.billing_updates, team_updates = excluded.team_updates, announcements = excluded.announcements, updated_at = now()`,
    [userId, values.productUpdates, values.billingUpdates, values.teamUpdates, values.announcements])
  return values
}

async function record(input: { userId?: string; to: string; category: EmailCategory; template: string; subject: string; status: 'sent' | 'failed' | 'suppressed'; error?: string; metadata?: Record<string, unknown> }) {
  await pool.query(`insert into email_delivery (user_id, recipient, category, template, subject, status, error_message, metadata)
    values ($1,$2,$3,$4,$5,$6,$7,$8)`, [input.userId ?? null, input.to, input.category, input.template, input.subject, input.status, input.error ?? null, JSON.stringify(input.metadata ?? {})])
}

export async function sendEmail(input: { userId?: string; to: string; category: EmailCategory; template: string; subject: string; html: string; metadata?: Record<string, unknown>; force?: boolean }) {
  if (!input.force && input.userId && input.category !== 'authentication') {
    const preferences = await getEmailPreferences(input.userId)
    if (!preferences[preferenceColumn[input.category]]) {
      await record({ ...input, status: 'suppressed' })
      return { status: 'suppressed' as const }
    }
  }
  try {
    await transport.sendMail({ from: required('SMTP_FROM'), to: input.to, subject: input.subject, text: textFromHtml(input.html), html: input.html })
    await record({ ...input, status: 'sent' })
    return { status: 'sent' as const }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email delivery failed.'
    await record({ ...input, status: 'failed', error: message })
    throw error
  }
}

export async function sendOtpEmail(input: { to: string; otp: string; type: string }) {
  const subject = input.type === 'forget-password' ? 'Reset your Sulphur password' : input.type === 'email-verification' ? 'Verify your Sulphur email' : 'Your Sulphur sign-in code'
  await sendEmail({ to: input.to, category: 'authentication', template: input.type, subject, force: true, html: `<p>Your Sulphur code is <strong>${input.otp}</strong>.</p><p>It expires in 10 minutes. If you did not request it, you can ignore this email.</p>` })
}

export async function sendBillingEmail(input: { userId: string; to: string; name?: string; event: 'purchase_success' | 'payment_failed'; plan?: string; amount?: string }) {
  const success = input.event === 'purchase_success'
  const subject = success ? `Your Sulphur ${input.plan ?? ''} plan is active`.trim() : 'Action needed: your Sulphur payment failed'
  const body = success ? `<p>Hi ${input.name ?? 'there'},</p><p>Your ${input.plan ?? 'Sulphur'} plan is now active${input.amount ? ` (${input.amount})` : ''}. You can manage billing anytime in Settings.</p>` : `<p>Hi ${input.name ?? 'there'},</p><p>We could not process your Sulphur payment. Please update your payment method to keep your workspace active.</p>`
  return sendEmail({ userId: input.userId, to: input.to, category: 'billing', template: input.event, subject, html: body })
}
