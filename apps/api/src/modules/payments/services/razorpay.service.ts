import { createHmac, timingSafeEqual } from 'node:crypto'

import { env } from '../../../config/env.js'
import { AppError } from '../../../shared/errors/app-error.js'

type RazorpayOrder = {
  id: string
  amount: number
  currency: string
  receipt?: string
  status: string
}

export type RazorpayPayment = {
  id: string
  order_id: string
  amount: number
  currency: string
  status: string
  method?: string
  captured?: boolean
}

type RazorpayErrorPayload = {
  error?: {
    code?: string
    description?: string
    reason?: string
  }
}

function assertCredentials(): void {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError(
      503,
      'Razorpay is not configured yet. Add the API key ID and secret, then restart the API.',
      'RAZORPAY_NOT_CONFIGURED',
    )
  }
}

function safeEqualHex(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'hex')
  const receivedBuffer = Buffer.from(received, 'hex')

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  )
}

class RazorpayService {
  isConfigured(): boolean {
    return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)
  }

  getPublicKeyId(): string {
    assertCredentials()
    return env.RAZORPAY_KEY_ID
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    assertCredentials()

    const authorization = Buffer.from(
      `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`,
    ).toString('base64')

    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${authorization}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })

    const payload = (await response.json().catch(() => ({}))) as
      | T
      | RazorpayErrorPayload

    if (!response.ok) {
      const errorPayload = payload as RazorpayErrorPayload
      throw new AppError(
        502,
        errorPayload.error?.description ??
          'Razorpay could not process the payment request.',
        errorPayload.error?.code ?? 'RAZORPAY_REQUEST_FAILED',
        errorPayload.error,
      )
    }

    return payload as T
  }

  async createOrder(input: {
    amountPaise: number
    currency: 'INR'
    receipt: string
    notes: Record<string, string>
  }): Promise<RazorpayOrder> {
    return this.request<RazorpayOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: input.currency,
        receipt: input.receipt,
        notes: input.notes,
      }),
    })
  }

  async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    return this.request<RazorpayPayment>(
      `/payments/${encodeURIComponent(paymentId)}`,
    )
  }

  verifyPaymentSignature(input: {
    orderId: string
    paymentId: string
    signature: string
  }): boolean {
    assertCredentials()

    const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest('hex')

    return safeEqualHex(expected, input.signature)
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      throw new AppError(
        503,
        'Razorpay webhook secret is not configured.',
        'RAZORPAY_WEBHOOK_NOT_CONFIGURED',
      )
    }

    const expected = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex')

    return safeEqualHex(expected, signature)
  }
}

export const razorpayService = new RazorpayService()
