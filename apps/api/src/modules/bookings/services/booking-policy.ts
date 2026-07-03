import { AppError } from '../../../shared/errors/app-error.js'
import { PlatformSettingModel } from '../../admin/models/platform-setting.model.js'

export async function assertBookingWindow(scheduledAt: Date) {
  const settings = await PlatformSettingModel.findOne({ key: 'platform' }).lean()

  if (settings?.maintenanceMode) {
    throw new AppError(
      503,
      'Booking changes are temporarily unavailable during maintenance',
      'MAINTENANCE_MODE',
    )
  }

  const noticeHours = settings?.minimumBookingNoticeHours ?? 2
  const advanceDays = settings?.maximumBookingAdvanceDays ?? 60
  const millisecondsUntilSession = scheduledAt.getTime() - Date.now()

  if (millisecondsUntilSession <= 0) {
    throw new AppError(409, 'This time slot has already passed', 'SLOT_EXPIRED')
  }
  if (millisecondsUntilSession < noticeHours * 60 * 60 * 1000) {
    throw new AppError(
      409,
      `Bookings require at least ${noticeHours} hours notice`,
      'BOOKING_NOTICE_TOO_SHORT',
    )
  }
  if (millisecondsUntilSession > advanceDays * 24 * 60 * 60 * 1000) {
    throw new AppError(
      409,
      `Bookings can only be made ${advanceDays} days in advance`,
      'BOOKING_TOO_FAR_AHEAD',
    )
  }

  return settings
}
