# Edvixa Deployment Checklist

## Before deployment

- [ ] Use Node.js 22+ and run `npm ci` from the committed lockfile.
- [ ] Run `npm run check`, `npm audit`, and `npm audit --omit=dev`.
- [ ] Create a MongoDB backup and verify restore access.
- [ ] Configure a least-privilege MongoDB database user and network allowlist/private connectivity.
- [ ] Set unique 32+ character JWT secrets from a secret manager.
- [ ] Set a non-default administrator email and strong password.
- [ ] Configure HTTPS `APP_URL` and exact HTTPS `CLIENT_URL` origins.
- [ ] Configure secure cookie options for the chosen domain topology.
- [ ] Verify a Resend sender domain and test verification/reset email delivery.
- [ ] Configure Razorpay test keys, webhook secret, and webhook URL.
- [ ] Exercise payment success, failure, duplicate webhook, timeout, cancellation, and refund flows in test mode.
- [ ] Review and run `npm run db:indexes` in a safe maintenance window.
- [ ] Remove or disable development/demo accounts before live launch.

## Infrastructure

- [ ] Terminate TLS with a valid certificate and redirect HTTP to HTTPS.
- [ ] Proxy `/api/v1` to the API and serve the web SPA with route fallback to `index.html`.
- [ ] Preserve `X-Forwarded-*` headers and set `TRUST_PROXY_HOPS` to the actual trusted proxy count.
- [ ] Set process memory/CPU limits and automatic restart policy.
- [ ] Configure centralized JSON logs, error monitoring, uptime probes, and alerting.
- [ ] Probe `/api/v1/health` for liveness and `/api/v1/ready` for readiness.
- [ ] Configure automated MongoDB backups, retention, encryption, and restore drills.

## Release validation

- [ ] Register, verify email, log in, refresh the page, and log out as a student.
- [ ] Complete teacher application and admin approval.
- [ ] Create availability in `Asia/Kolkata` and at least one daylight-saving timezone; confirm displayed UTC/local times.
- [ ] Complete a student practice attempt and review results/progress.
- [ ] Create and interact with a doubt poll.
- [ ] Discover a teacher, reserve a slot, pay, accept, join, complete, review, and download a receipt.
- [ ] Confirm expired unpaid reservations release their slots.
- [ ] Confirm a late captured payment does not reclaim a slot already released/rebooked and triggers refund handling.
- [ ] Test student and teacher announcements/support flows through the admin queue.
- [ ] Test every admin page and audit record with production-like data.
- [ ] Test mobile and desktop browsers, keyboard navigation, form errors, slow network, and API failures.

## After deployment

- [ ] Confirm the deployed commit/package checksum.
- [ ] Confirm health/readiness and a real database query.
- [ ] Confirm transactional email and Razorpay webhook delivery.
- [ ] Review logs for secrets, unexpected 4xx/5xx spikes, or slow endpoints.
- [ ] Record release owner, date, rollback version, and known limitations.
