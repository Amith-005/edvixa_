# Edvixa Verification Results

**Executed:** 3 July 2026  
**Environment:** isolated Linux build container, Node.js/npm workspace installation, no external MongoDB/Resend/Razorpay credentials

## Automated result summary

| Gate | Result |
|---|---|
| API TypeScript | Pass |
| Web TypeScript | Pass |
| API test suites | 4 passed |
| API tests | 12 passed, 0 failed |
| API production build | Pass |
| Web production build | Pass |
| npm audit (all dependencies) | 0 known vulnerabilities |
| npm audit (production dependencies) | 0 known vulnerabilities |
| Insecure production environment rejection | Pass |
| Secure-format production environment acceptance | Pass |
| Static preview `/` | HTTP 200 |
| Static preview `/admin/dashboard` | HTTP 200 with SPA fallback |
| Rust/Cargo source scan | No Rust/Cargo project found |

## Web build profile

- Initial application JavaScript: approximately 382.99 kB, 123.63 kB gzip.
- Feature routes are emitted as independent lazy-loaded chunks.
- Main stylesheet: approximately 116.16 kB, 19.63 kB gzip.

## Commands

```bash
npm run check
npm audit
npm audit --omit=dev
npm run preview --workspace=@edvixa/web -- --host 127.0.0.1 --port 4173
```

## Scope boundary

The test container did not have a live MongoDB server or the owner's Resend/Razorpay/TLS infrastructure. Therefore database-backed end-to-end behavior and external-service delivery are release checklist items, not claimed as completed live checks. A Chromium DOM attempt was also blocked by the container's missing desktop/DBus/inotify support; HTTP preview and production asset generation passed, while real-browser acceptance remains a deployment task.
