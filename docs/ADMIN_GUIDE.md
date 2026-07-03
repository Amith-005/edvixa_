# Edvixa Administrator Guide

## Access

Log in with an account whose role is `admin`. The API validates the role on every admin route; hiding navigation in the browser is not the security boundary.

## Dashboard

The dashboard summarizes users, teachers, bookings, payments, support load, and recent activity. Use it to identify pending approvals, unpaid or disputed fees, and open support tickets.

## Users

- Search and filter students, teachers, and administrators.
- Open a user record to review profile, account status, booking history, and financial totals.
- Activate, suspend, block, or restore an account through explicit actions.
- Every state-changing admin operation creates an audit-log record.

Do not change user state without documenting the reason. Blocking should be reserved for abuse or security cases; suspension is better for temporary restrictions.

## Teacher approvals

- Review pending teacher applications and profile evidence.
- Approve qualified profiles or reject them with a clear reason.
- Approved teachers can publish availability and manage paid sessions.

Approval changes are recorded for accountability.

## Bookings

- Filter bookings by status, participant, subject, or date.
- Review scheduled time, timezone, payment state, and participant details.
- Cancel or complete sessions only when the current booking/payment state permits it.
- Cancellation releases the associated availability slot and reconciles pending fees or refund requests.

The system stores wall-clock availability with an IANA timezone and converts it to UTC, preventing server-timezone shifts.

## Fees, refunds, and payouts

- Search payment records and inspect amount, platform fee, total, gateway, and refund state.
- Mark eligible refund or payout workflow states only after verifying the payment-provider record.
- CSV exports neutralize spreadsheet-formula prefixes to reduce formula-injection risk.

Razorpay remains the source of truth for real money movement. Reconcile provider exports with Edvixa records before closing a financial period.

## Subjects and topics

- Create, edit, activate, or deactivate subjects.
- Manage subject topics, descriptions, grade levels, and difficulty data.
- A subject referenced by historical records should generally be deactivated rather than removed.

## Analytics and reports

- Review date-range metrics for registrations, bookings, completion, and revenue.
- Export supported reports as CSV for operational analysis.
- Treat exported personal and financial data as confidential and delete local copies when no longer needed.

## Announcements

- Create audience-specific announcements for all users, students, or teachers.
- Control publication and expiry dates.
- Edit or unpublish outdated notices instead of duplicating conflicting messages.

## Platform settings

The settings page controls maintenance mode, student registration, teacher applications, minimum booking notice, maximum advance booking days, and platform fee percentage. Changes affect live registration and booking workflows.

Use maintenance mode for controlled downtime. Verify the configured fee percentage with business and accounting owners before changing it.

## Roles and security

- The roles page documents current role capabilities.
- The security area shows audit events and administrative actions.
- Request IDs in logs can be used to correlate a browser/API error with server logs.

Never share administrator credentials. Use a unique password, protect the administrator email account with multi-factor authentication, rotate secrets after staff changes, and remove unused admin accounts.

## Support tickets

- Filter tickets by status, priority, role, or search text.
- Assign, investigate, reply, resolve, or close tickets.
- Keep resolutions factual and avoid including passwords, tokens, or unnecessary sensitive data.

## Daily operational routine

1. Review system health/readiness and monitoring alerts.
2. Process urgent support tickets and security events.
3. Review pending teacher applications.
4. Check failed payments, refund requests, and expired reservations.
5. Review upcoming sessions and abnormal cancellation patterns.
6. Confirm backups and scheduled reports completed.
