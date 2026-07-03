import { createHash } from 'node:crypto'
import { env } from '../../config/env.js'

export type TransactionalEmail = {
  to: string
  subject: string
  text: string
  tag: 'email-verification' | 'password-reset'
}

class EmailService {
  async send(message: TransactionalEmail): Promise<void> {
    if (env.EMAIL_PROVIDER === 'console') {
      if (env.NODE_ENV !== 'production') {
        console.log(JSON.stringify({
          level: 'info',
          message: 'Development email generated',
          to: message.to,
          subject: message.subject,
          text: message.text,
        }))
      }
      return
    }

    const idempotencyKey = createHash('sha256')
      .update(`${message.tag}:${message.to}:${message.subject}:${message.text}`)
      .digest('hex')
      .slice(0, 48)

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        tags: [{ name: 'type', value: message.tag }],
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`Email provider rejected the request (${response.status}): ${detail.slice(0, 300)}`)
    }
  }
}

export const emailService = new EmailService()
