import { Schema, model } from 'mongoose'

const feeSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0, default: 0 },
    platformCommission: { type: Number, required: true, min: 0, default: 0 },
    teacherEarning: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['upi', 'card', 'netbanking', 'wallet'],
      required: true,
    },
    paymentGateway: {
      type: String,
      enum: ['demo', 'razorpay'],
      default: 'demo',
      index: true,
    },
    gatewayOrderId: { type: String, default: null },
    gatewayPaymentId: { type: String, default: null },
    gatewaySignature: { type: String, default: null },
    receiptUrl: { type: String, default: null },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    dueDate: { type: Date, default: null },
    refundStatus: {
      type: String,
      enum: ['none', 'requested', 'processed', 'failed'],
      default: 'none',
    },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundedAt: { type: Date, default: null },
    refundReason: { type: String, default: null },
    payoutStatus: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'failed'],
      default: 'pending',
    },
    payoutId: { type: Schema.Types.ObjectId, ref: 'Payout', default: null },
  },
  { timestamps: true },
)

feeSchema.index({ studentId: 1, createdAt: -1 })
feeSchema.index({ teacherId: 1, createdAt: -1 })
feeSchema.index({ gatewayOrderId: 1 }, { unique: true, sparse: true })

export const FeeModel = model('Fee', feeSchema)
