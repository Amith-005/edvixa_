import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import {
  hashToken,
  randomOtp,
  randomToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../shared/security/token.js'
import { zonedDateTimeToUtc } from '../shared/time/zoned-date-time.js'
import { isValidIanaTimezone } from '../shared/validation/iana-timezone.js'

describe('security tokens', () => {
  it('signs and verifies access and refresh tokens with distinct claims', () => {
    const access = signAccessToken({ sub: 'user-1', email: 'student@example.com', role: 'student' })
    const refresh = signRefreshToken('session-1', 'user-1')

    assert.deepEqual(verifyAccessToken(access), {
      ...verifyAccessToken(access),
      sub: 'user-1',
      email: 'student@example.com',
      role: 'student',
    })
    assert.equal(verifyRefreshToken(refresh).sid, 'session-1')
    assert.equal(verifyRefreshToken(refresh).type, 'refresh')
    assert.throws(() => verifyAccessToken(refresh))
  })

  it('rejects refresh tokens without the required refresh type', () => {
    const malformed = jwt.sign(
      { sub: 'user-1', sid: 'session-1', type: 'other' },
      env.JWT_REFRESH_SECRET,
      { algorithm: 'HS256', issuer: 'edvixa-api', audience: 'edvixa-web', expiresIn: '5m' },
    )
    assert.throws(() => verifyRefreshToken(malformed))
  })

  it('creates non-plaintext token material of expected shape', () => {
    const token = randomToken()
    assert.equal(token.length, 64)
    assert.match(token, /^[a-f\d]+$/)
    assert.equal(hashToken(token).length, 64)
    assert.match(randomOtp(), /^\d{6}$/)
  })
})

describe('timezone-safe scheduling', () => {
  it('converts an Asia/Kolkata wall-clock slot to the correct UTC instant', () => {
    const result = zonedDateTimeToUtc(new Date('2026-07-03T00:00:00.000Z'), '10:00', 'Asia/Kolkata')
    assert.equal(result.toISOString(), '2026-07-03T04:30:00.000Z')
  })

  it('handles daylight-saving offsets through IANA timezone data', () => {
    const summer = zonedDateTimeToUtc('2026-07-03T00:00:00.000Z', '10:00', 'America/New_York')
    const winter = zonedDateTimeToUtc('2026-01-03T00:00:00.000Z', '10:00', 'America/New_York')
    assert.equal(summer.toISOString(), '2026-07-03T14:00:00.000Z')
    assert.equal(winter.toISOString(), '2026-01-03T15:00:00.000Z')
  })
})

describe('timezone validation', () => {
  it('accepts IANA zones and rejects arbitrary labels', () => {
    assert.equal(isValidIanaTimezone('Asia/Kolkata'), true)
    assert.equal(isValidIanaTimezone('Not/A_Real_Zone'), false)
  })
})
