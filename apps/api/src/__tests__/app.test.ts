import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import request from 'supertest'
import { app } from '../app.js'

describe('Edvixa API application shell', () => {
  it('serves a liveness response with hardened headers and a request ID', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .set('x-request-id', 'test-request-123')
      .expect(200)

    assert.equal(response.body.success, true)
    assert.equal(response.body.data.status, 'ok')
    assert.equal(response.headers['x-request-id'], 'test-request-123')
    assert.equal(response.headers['x-powered-by'], undefined)
    assert.match(String(response.headers['content-security-policy']), /default-src/)
  })

  it('reports not-ready while MongoDB is disconnected', async () => {
    const response = await request(app).get('/api/v1/ready').expect(503)
    assert.equal(response.body.success, false)
    assert.equal(response.body.data.status, 'not-ready')
  })

  it('protects administrator endpoints', async () => {
    const response = await request(app).get('/api/v1/admin/dashboard').expect(401)
    assert.equal(response.body.error.code, 'UNAUTHENTICATED')
    assert.equal(typeof response.body.error.requestId, 'string')
  })

  it('returns a structured 404 without leaking stack details', async () => {
    const response = await request(app).get('/api/v1/does-not-exist').expect(404)
    assert.equal(response.body.success, false)
    assert.equal(response.body.error.code, 'NOT_FOUND')
    assert.equal(typeof response.body.error.requestId, 'string')
  })

  it('rejects state-changing browser requests from an untrusted origin', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('origin', 'https://untrusted.example')
      .expect(403)
    assert.equal(response.body.error.code, 'UNTRUSTED_ORIGIN')
  })

  it('does not grant CORS access to an untrusted browser origin', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .set('origin', 'https://untrusted.example')
      .expect(200)
    assert.equal(response.headers['access-control-allow-origin'], undefined)
  })
})
