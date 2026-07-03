import { Schema, model } from 'mongoose'

const platformSettingSchema = new Schema(
  {
    key: { type: String, default: 'platform', unique: true, immutable: true },
    platformName: { type: String, default: 'Edvixa', trim: true, maxlength: 80 },
    supportEmail: { type: String, default: 'support@edvixa.local', trim: true, lowercase: true },
    defaultTimezone: { type: String, default: 'Asia/Kolkata', trim: true },
    maintenanceMode: { type: Boolean, default: false },
    allowRegistrations: { type: Boolean, default: true },
    allowTeacherApplications: { type: Boolean, default: true },
    platformFeePercent: { type: Number, default: 5, min: 0, max: 100 },
    minimumBookingNoticeHours: { type: Number, default: 2, min: 0, max: 168 },
    maximumBookingAdvanceDays: { type: Number, default: 60, min: 1, max: 365 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

export const PlatformSettingModel = model('PlatformSetting', platformSettingSchema)
