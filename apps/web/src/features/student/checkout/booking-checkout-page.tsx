import '../../doubts/doubt-polls-layout.css'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  CreditCard,
  GraduationCap,
  IndianRupee,
  Landmark,
  LockKeyhole,
  MessageSquareText,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  UserRound,
  WalletCards,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { Card } from '../../../components/ui'
import { api } from '../../../lib/api'
import type {
  BookingCreateResponse,
  CheckoutSummaryResponse,
  PaymentMethod,
  RazorpayOrderResponse,
  RazorpayPaymentSuccess,
} from './types'

const paymentOptions: Array<{
  id: PaymentMethod
  title: string
  description: string
  icon: typeof Smartphone
}> = [
  {
    id: 'upi',
    title: 'UPI',
    description: 'Google Pay, PhonePe, Paytm or any UPI app',
    icon: Smartphone,
  },
  {
    id: 'card',
    title: 'Card',
    description: 'Credit or debit card',
    icon: CreditCard,
  },
  {
    id: 'netbanking',
    title: 'Net banking',
    description: 'Pay through your bank account',
    icon: Landmark,
  },
  {
    id: 'wallet',
    title: 'Wallet',
    description: 'Use a supported digital wallet',
    icon: WalletCards,
  },
]

type RazorpayCheckoutOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill?: { name?: string; email?: string }
  notes?: Record<string, string>
  theme?: { color?: string }
  handler: (response: RazorpayPaymentSuccess) => void
  modal?: { ondismiss?: () => void }
}

type RazorpayCheckoutInstance = {
  open: () => void
  on: (event: 'payment.failed', handler: (response: unknown) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance
  }
}

let razorpayScriptPromise: Promise<void> | null = null

function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  if (razorpayScriptPromise) return razorpayScriptPromise

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-edvixa-razorpay="true"]',
    )

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error('Razorpay Checkout could not be loaded.')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.dataset.edvixaRazorpay = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Razorpay Checkout could not be loaded.'))
    document.head.appendChild(script)
  })

  return razorpayScriptPromise
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? fallback
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateTime(value: string): { date: string; time: string } {
  const date = new Date(value)
  return {
    date: date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
    }),
  }
}

function CheckoutLoading() {
  return (
    <div className="booking-checkout-loading" aria-label="Loading checkout">
      <div className="skeleton booking-checkout-loading-heading" />
      <div className="booking-checkout-grid">
        <div className="booking-checkout-loading-column">
          <div className="skeleton booking-checkout-loading-card" />
          <div className="skeleton booking-checkout-loading-card" />
        </div>
        <div className="skeleton booking-checkout-loading-summary" />
      </div>
    </div>
  )
}

function CheckoutError({
  message,
  onRetry,
  teacherId,
}: {
  message: string
  onRetry: () => void
  teacherId: string
}) {
  return (
    <Card className="booking-checkout-error">
      <CircleAlert size={42} />
      <h1>Checkout could not be prepared</h1>
      <p>{message}</p>
      <div className="booking-checkout-error-actions">
        <button type="button" className="button" onClick={onRetry}>
          <RotateCcw size={17} /> Try again
        </button>
        <Link
          className="button button-secondary"
          to={teacherId ? `/student/teachers/${teacherId}?book=1` : '/student/teachers'}
        >
          Change session
        </Link>
      </div>
    </Card>
  )
}

function BookingSuccess({ result }: { result: BookingCreateResponse }) {
  const schedule = formatDateTime(result.booking.scheduledAt)

  return (
    <div className="booking-success-page">
      <Card className="booking-success-card">
        <div className="booking-success-icon">
          <CheckCircle2 size={42} />
        </div>
        <span className="booking-success-badge">Payment successful</span>
        <h1>Your lesson is booked</h1>
        <p>
          Your session with {result.booking.teacherName} is confirmed. It will
          appear in My Sessions with joining details when available.
        </p>

        <div className="booking-success-summary">
          <div>
            <span>Teacher</span>
            <strong>{result.booking.teacherName}</strong>
          </div>
          <div>
            <span>Subject</span>
            <strong>{result.booking.subjectName}</strong>
          </div>
          <div>
            <span>Chapter / Topic</span>
            <strong>{result.booking.topicName}</strong>
          </div>
          <div>
            <span>Date</span>
            <strong>{schedule.date}</strong>
          </div>
          <div>
            <span>Time</span>
            <strong>{schedule.time}</strong>
          </div>
          <div>
            <span>Amount paid</span>
            <strong>{formatMoney(result.payment.totalAmount)}</strong>
          </div>
        </div>

        <div className="booking-success-actions">
          <Link className="button" to="/student/sessions">
            View My Sessions <ChevronRight size={18} />
          </Link>
          <Link className="button button-secondary" to="/student/dashboard">
            Back to dashboard
          </Link>
        </div>

        <p className="booking-success-note">
          <ShieldCheck size={15} /> Booking ID: {result.booking.id}
        </p>
      </Card>
    </div>
  )
}

export function BookingCheckoutPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi')
  const [studentNote, setStudentNote] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [paymentResult, setPaymentResult] = useState<BookingCreateResponse | null>(null)
  const [paymentError, setPaymentError] = useState('')

  const selection = useMemo(
    () => ({
      teacherId: searchParams.get('teacherId') ?? '',
      subjectId: searchParams.get('subjectId') ?? '',
      topicId: searchParams.get('topicId') ?? '',
      topicName: searchParams.get('topicName') ?? '',
      doubtPollId: searchParams.get('doubtPollId') ?? '',
      customTopic: searchParams.get('customTopic') === '1' ? ('1' as const) : ('0' as const),
      slotId: searchParams.get('slotId') ?? '',
    }),
    [searchParams],
  )

  const hasRequiredSelection = Boolean(
    selection.teacherId &&
      selection.subjectId &&
      selection.topicName &&
      selection.doubtPollId &&
      selection.slotId &&
      (selection.customTopic === '1' || selection.topicId),
  )

  const checkoutQuery = useQuery({
    queryKey: ['booking-checkout', selection],
    enabled: hasRequiredSelection,
    retry: false,
    queryFn: () =>
      api
        .get<{ data: CheckoutSummaryResponse }>('/bookings/checkout', {
          params: {
            teacherId: selection.teacherId,
            subjectId: selection.subjectId,
            ...(selection.topicId ? { topicId: selection.topicId } : {}),
            topicName: selection.topicName,
            doubtPollId: selection.doubtPollId,
            customTopic: selection.customTopic,
            slotId: selection.slotId,
          },
        })
        .then((response) => response.data.data),
  })

  const paymentPayload = () => ({
    teacherId: selection.teacherId,
    subjectId: selection.subjectId,
    ...(selection.topicId ? { topicId: selection.topicId } : {}),
    topicName: selection.topicName,
    doubtPollId: selection.doubtPollId,
    customTopic: selection.customTopic,
    slotId: selection.slotId,
    paymentMethod,
    studentNote: studentNote.trim(),
    agreedToTerms,
  })

  const demoBookingMutation = useMutation({
    mutationFn: () =>
      api
        .post<{ data: BookingCreateResponse }>('/bookings', paymentPayload())
        .then((response) => response.data.data),
    onSuccess: (result) => setPaymentResult(result),
  })

  const verifyPaymentMutation = useMutation({
    mutationFn: (response: RazorpayPaymentSuccess) =>
      api
        .post<{ data: BookingCreateResponse }>('/bookings/payment/verify', {
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        })
        .then((result) => result.data.data),
    onSuccess: (result) => {
      setPaymentError('')
      setPaymentResult(result)
    },
    onError: (error) => {
      setPaymentError(
        getApiErrorMessage(
          error,
          'Payment was received, but verification is still pending. Please refresh after a moment.',
        ),
      )
    },
  })

  const cancelPaymentMutation = useMutation({
    mutationFn: (orderId: string) =>
      api.post('/bookings/payment/cancel', {
        orderId,
        reason: 'Razorpay Checkout was closed before payment',
      }),
  })

  const createOrderMutation = useMutation({
    mutationFn: () =>
      api
        .post<{ data: RazorpayOrderResponse }>(
          '/bookings/payment/order',
          paymentPayload(),
        )
        .then((response) => response.data.data),
    onSuccess: async (order) => {
      setPaymentError('')

      try {
        await loadRazorpayCheckout()
        if (!window.Razorpay) {
          throw new Error('Razorpay Checkout is unavailable.')
        }

        let paymentSubmitted = false
        const checkout = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'Edvixa',
          description: `${checkoutQuery.data?.subject.name ?? 'Lesson'} · ${checkoutQuery.data?.topic.name ?? 'Topic'}`,
          order_id: order.orderId,
          prefill: order.prefill,
          notes: {
            bookingId: order.bookingId,
            topic: checkoutQuery.data?.topic.name ?? '',
          },
          theme: { color: '#f4c44e' },
          handler: (response) => {
            paymentSubmitted = true
            verifyPaymentMutation.mutate(response)
          },
          modal: {
            ondismiss: () => {
              if (!paymentSubmitted) {
                cancelPaymentMutation.mutate(order.orderId)
              }
            },
          },
        })

        checkout.on('payment.failed', () => {
          setPaymentError(
            'The payment attempt failed. You can retry safely from Razorpay Checkout.',
          )
        })
        checkout.open()
      } catch (error) {
        cancelPaymentMutation.mutate(order.orderId)
        setPaymentError(
          error instanceof Error
            ? error.message
            : 'Razorpay Checkout could not be opened.',
        )
      }
    },
    onError: (error) => {
      setPaymentError(
        getApiErrorMessage(error, 'Razorpay order could not be created.'),
      )
    },
  })

  if (!hasRequiredSelection) {
    return (
      <CheckoutError
        message="Teacher, subject, chapter, joined doubt poll and time are required before checkout."
        teacherId={selection.teacherId}
        onRetry={() => navigate('/student/teachers')}
      />
    )
  }

  if (checkoutQuery.isLoading) return <CheckoutLoading />

  if (checkoutQuery.isError || !checkoutQuery.data) {
    const message =
      (checkoutQuery.error as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ??
      'The selected slot may no longer be available. Please choose another time.'

    return (
      <CheckoutError
        message={message}
        teacherId={selection.teacherId}
        onRetry={() => checkoutQuery.refetch()}
      />
    )
  }

  if (paymentResult) {
    return <BookingSuccess result={paymentResult} />
  }

  const data = checkoutQuery.data
  const schedule = formatDateTime(data.slot.scheduledAt)
  const selectedPayment =
    paymentOptions.find((option) => option.id === paymentMethod) ?? paymentOptions[0]
  const isRazorpay = data.payment.provider === 'razorpay'
  const isPaymentPending =
    demoBookingMutation.isPending ||
    createOrderMutation.isPending ||
    verifyPaymentMutation.isPending
  const mutationMessage =
    paymentError ||
    (demoBookingMutation.isError
      ? getApiErrorMessage(
          demoBookingMutation.error,
          'Payment could not be completed. Please try again.',
        )
      : '')
  const razorpayUnavailable = isRazorpay && !data.payment.razorpayConfigured

  return (
    <div className="booking-checkout-page">
      <header className="booking-checkout-header">
        <div>
          <Link to={`/student/teachers/${selection.teacherId}?book=1`}>
            <ArrowLeft size={17} /> Change session
          </Link>
          <p className="muted">Student · Secure checkout</p>
          <h1>Confirm your lesson</h1>
          <p className="muted">
            Review the teacher, chapter, doubt poll, schedule and price before booking.
          </p>
        </div>
        <div className="booking-checkout-secure">
          <LockKeyhole size={18} /> {isRazorpay ? 'Secured by Razorpay' : 'Secure demo payment'}
        </div>
      </header>

      <div className="booking-checkout-grid">
        <main className="booking-checkout-main">
          <Card className="booking-checkout-section">
            <div className="booking-checkout-section-heading">
              <div className="booking-checkout-section-icon">
                <UserRound size={21} />
              </div>
              <div>
                <p className="muted">Teacher summary</p>
                <h2>Your one-to-one educator</h2>
              </div>
            </div>

            <div className="booking-checkout-teacher">
              <div className="booking-checkout-avatar" aria-hidden="true">
                {data.teacher.avatar ? (
                  <img src={data.teacher.avatar} alt="" />
                ) : (
                  getInitials(data.teacher.name)
                )}
              </div>
              <div>
                <span className="booking-checkout-verified">
                  <BadgeCheck size={14} /> Verified teacher
                </span>
                <h3>{data.teacher.name}</h3>
                <p>{data.subject.name} · One-hour personalised session</p>
              </div>
              <Link
                to={`/student/teachers/${data.teacher.id}`}
                className="button button-secondary"
              >
                View profile
              </Link>
            </div>
          </Card>

          <Card className="booking-checkout-section">
            <div className="booking-checkout-section-heading">
              <div className="booking-checkout-section-icon purple">
                <CalendarDays size={21} />
              </div>
              <div>
                <p className="muted">Selected session</p>
                <h2>Lesson details</h2>
              </div>
            </div>

            <div className="booking-checkout-details-grid">
              <div>
                <BookOpen size={19} />
                <span>Subject</span>
                <strong>{data.subject.name}</strong>
              </div>
              <div>
                <GraduationCap size={19} />
                <span>Chapter / Topic</span>
                <strong>{data.topic.name}</strong>
              </div>
              <div className="booking-checkout-doubt-detail">
                <MessageSquareText size={19} />
                <span>Doubt poll</span>
                <strong>{data.doubt.title}</strong>
                <small>{data.doubt.gradeLevel}</small>
              </div>
              <div>
                <CalendarDays size={19} />
                <span>Date</span>
                <strong>{schedule.date}</strong>
              </div>
              <div>
                <Clock3 size={19} />
                <span>Time</span>
                <strong>{schedule.time}</strong>
              </div>
              <div>
                <Clock3 size={19} />
                <span>Duration</span>
                <strong>{data.slot.durationMinutes} minutes</strong>
              </div>
              <div>
                <ShieldCheck size={19} />
                <span>Timezone</span>
                <strong>{data.slot.timezone}</strong>
              </div>
            </div>

            <label className="booking-checkout-note-field">
              Note for the teacher <span>(optional)</span>
              <textarea
                value={studentNote}
                maxLength={500}
                rows={4}
                placeholder="Share the exact concept, exercise or doubt you want to cover."
                onChange={(event) => setStudentNote(event.target.value)}
              />
              <small>{studentNote.length}/500</small>
            </label>
          </Card>

          <Card className="booking-checkout-section">
            <div className="booking-checkout-section-heading">
              <div className="booking-checkout-section-icon">
                <Banknote size={21} />
              </div>
              <div>
                <p className="muted">Payment</p>
                <h2>Choose a payment method</h2>
              </div>
            </div>

            <div className="booking-payment-options">
              {paymentOptions.map((option) => {
                const Icon = option.icon
                const selected = paymentMethod === option.id
                return (
                  <button
                    type="button"
                    key={option.id}
                    className={selected ? 'selected' : ''}
                    aria-pressed={selected}
                    onClick={() => setPaymentMethod(option.id)}
                  >
                    <span className="booking-payment-icon">
                      <Icon size={21} />
                    </span>
                    <span>
                      <strong>{option.title}</strong>
                      <small>{option.description}</small>
                    </span>
                    <span className="booking-payment-radio" aria-hidden="true" />
                  </button>
                )
              })}
            </div>

            <div className="booking-payment-demo-note">
              <LockKeyhole size={18} />
              <p>
                <strong>
                  {isRazorpay ? 'Razorpay secure checkout' : 'Local demo checkout'}
                </strong>
                {isRazorpay
                  ? 'Razorpay opens a secure payment window. Edvixa never receives or stores your card, UPI PIN or banking credentials.'
                  : 'No real card, UPI or bank details are collected. Selecting Pay & confirm creates a paid test booking in your local database.'}
              </p>
            </div>

            {razorpayUnavailable && (
              <div className="booking-checkout-mutation-error" role="alert">
                <CircleAlert size={18} />
                <span>
                  Razorpay is integrated but not configured. Add the API key ID and
                  secret to the server environment, then restart the API.
                </span>
              </div>
            )}
          </Card>

          <Card className="booking-checkout-policy">
            <ShieldCheck size={23} />
            <div>
              <h3>{data.cancellationPolicy.title}</h3>
              <p>{data.cancellationPolicy.description}</p>
            </div>
          </Card>
        </main>

        <aside className="booking-checkout-sidebar">
          <Card className="booking-checkout-summary-card">
            <p className="muted">Booking summary</p>
            <h2>Price breakdown</h2>

            <div className="booking-checkout-mini-session">
              <div>
                <span>Teacher</span>
                <strong>{data.teacher.name}</strong>
              </div>
              <div>
                <span>Chapter</span>
                <strong>{data.topic.name}</strong>
              </div>
              <div>
                <span>Doubt</span>
                <strong>{data.doubt.title}</strong>
              </div>
              <div>
                <span>Session</span>
                <strong>{schedule.date} · {schedule.time}</strong>
              </div>
            </div>

            <div className="booking-checkout-price-list">
              <div>
                <span>One-hour lesson</span>
                <strong>{formatMoney(data.pricing.amount)}</strong>
              </div>
              <div>
                <span>Platform fee</span>
                <strong>{formatMoney(data.pricing.platformFee)}</strong>
              </div>
              <div className="booking-checkout-total">
                <span>Total</span>
                <strong>{formatMoney(data.pricing.totalAmount)}</strong>
              </div>
            </div>

            <div className="booking-checkout-method-summary">
              {selectedPayment && <selectedPayment.icon size={18} />}
              <span>Paying with</span>
              <strong>{selectedPayment?.title ?? 'UPI'}</strong>
            </div>

            <label className="booking-checkout-terms">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(event) => setAgreedToTerms(event.target.checked)}
              />
              <span>
                I agree to the booking terms and cancellation policy.
              </span>
            </label>

            {mutationMessage && (
              <div className="booking-checkout-mutation-error" role="alert">
                <CircleAlert size={18} />
                <span>{mutationMessage}</span>
              </div>
            )}

            <button
              type="button"
              className="button booking-checkout-pay-button"
              disabled={!agreedToTerms || isPaymentPending || razorpayUnavailable}
              onClick={() => {
                setPaymentError('')
                if (isRazorpay) createOrderMutation.mutate()
                else demoBookingMutation.mutate()
              }}
            >
              {isPaymentPending ? (
                verifyPaymentMutation.isPending ? 'Verifying payment…' : 'Opening payment…'
              ) : (
                <>
                  <IndianRupee size={18} /> Pay {formatMoney(data.pricing.totalAmount)} {isRazorpay ? 'securely' : '& confirm'}
                </>
              )}
            </button>

            <button
              type="button"
              className="booking-checkout-cancel-button"
              disabled={isPaymentPending}
              onClick={() => navigate(`/student/teachers/${selection.teacherId}?book=1`)}
            >
              Cancel and change slot
            </button>

            <p className="booking-checkout-protection">
              <ShieldCheck size={15} /> {isRazorpay
                ? 'The slot is reserved while Razorpay Checkout is open and confirmed only after server-side verification.'
                : 'The selected slot is claimed only after successful confirmation.'}
            </p>
          </Card>
        </aside>
      </div>
    </div>
  )
}
