import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  adminBookingListSchema,
  createAnnouncementSchema,
} from '../modules/admin/validators/admin.validator.js'

describe('administrator request validation', () => {
  it('accepts the computed awaiting-completion booking filter', () => {
    const result = adminBookingListSchema.safeParse({
      query: {
        status: 'awaiting_completion',
        paymentStatus: 'all',
      },
    })

    assert.equal(result.success, true)
    if (result.success) {
      assert.equal(result.data.query.status, 'awaiting_completion')
      assert.equal(result.data.query.page, 1)
      assert.equal(result.data.query.limit, 20)
    }
  })

  it('rejects an announcement that expires before it is published', () => {
    const result = createAnnouncementSchema.safeParse({
      body: {
        title: 'Scheduled maintenance',
        message: 'The platform will be unavailable briefly.',
        audience: 'all',
        severity: 'warning',
        status: 'published',
        publishAt: '2026-07-04T10:00:00.000Z',
        expiresAt: '2026-07-04T09:00:00.000Z',
      },
    })

    assert.equal(result.success, false)
  })
})
