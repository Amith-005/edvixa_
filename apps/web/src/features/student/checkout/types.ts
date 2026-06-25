export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet'
export type PaymentProvider = 'demo' | 'razorpay'

export type CheckoutSummaryResponse = {
  student: {
    id: string
    name: string
    email: string
  }
  teacher: {
    id: string
    userId: string
    name: string
    avatar: string | null
  }
  subject: {
    id: string
    name: string
    slug: string
  }
  topic: {
    id: string | null
    name: string
    isCustom: boolean
  }
  doubt: {
    id: string
    title: string
    description: string
    gradeLevel: string
  }
  slot: {
    id: string
    date: string
    startTime: string
    endTime: string
    timezone: string
    scheduledAt: string
    endAt: string
    durationMinutes: number
  }
  pricing: {
    amount: number
    platformFee: number
    totalAmount: number
    currency: string
  }
  payment: {
    provider: PaymentProvider
    razorpayConfigured: boolean
  }
  cancellationPolicy: {
    title: string
    description: string
  }
}

export type BookingCreateResponse = {
  booking: {
    id: string
    status: string
    paymentStatus: string
    teacherName: string
    subjectName: string
    topicName: string
    scheduledAt: string
    endAt: string
    timezone: string
  }
  payment: {
    feeId: string
    status: string
    method: PaymentMethod
    amount: number
    platformFee: number
    totalAmount: number
    currency: string
    receiptUrl: string
  }
}

export type RazorpayOrderResponse = {
  provider: 'razorpay'
  keyId: string
  orderId: string
  amount: number
  currency: string
  bookingId: string
  expiresAt: string
  prefill: {
    name: string
    email: string
  }
}

export type RazorpayPaymentSuccess = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}
