import { Schema, model } from 'mongoose'

const availabilitySchema = new Schema(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    timezone: { type: String, default: 'Asia/Kolkata' },
    isBooked: { type: Boolean, default: false, index: true },
    isBlocked: { type: Boolean, default: false, index: true },
    isRecurring: { type: Boolean, default: false },
    recurringDays: { type: [Number], default: [] },
    recurringUntil: { type: Date, default: null },
    subjectIds: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', default: null },
  },
  { timestamps: true },
)

availabilitySchema.index(
  { teacherId: 1, date: 1, startTime: 1 },
  { unique: true },
)

export const AvailabilityModel = model('Availability', availabilitySchema)
