import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Mail,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Card, StatCard } from '../../../components/ui'
import { formatDate, formatMoney, getAdminData } from '../api'
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminTable,
  StatusBadge,
} from '../components'
import type { AdminBooking, AdminUser } from '../types'

type Details = {
  user: AdminUser & Record<string, unknown>
  profile: Record<string, unknown> | null
  bookings: AdminBooking[]
  metrics: {
    bookingCount: number
    practiceCount: number
    activeSessions: number
    fees: {
      paid: number
      refunded: number
      pending: number
    }
  }
}

const hiddenProfileKeys = new Set([
  '_id',
  '__v',
  'userId',
  'createdAt',
  'updatedAt',
])

function formatProfileLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase())
}

function renderProfileValue(key: string, value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="muted">Not provided</span>
  }

  if (typeof value === 'boolean') {
    const labels: Record<string, [string, string]> = {
      onboardingCompleted: ['Completed', 'Not completed'],
      isApproved: ['Approved', 'Not approved'],
      isActive: ['Active', 'Inactive'],
      isAiEnabled: ['Enabled', 'Disabled'],
    }
    const [enabledLabel, disabledLabel] = labels[key] ?? ['Yes', 'No']
    return <StatusBadge value={value ? enabledLabel : disabledLabel} />
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="muted">None</span>
    }

    return (
      <div className="admin-profile-chip-list">
        {value.map((item, index) => {
          const label =
            typeof item === 'object' && item !== null
              ? String(
                  (item as Record<string, unknown>).name ??
                    (item as Record<string, unknown>).title ??
                    (item as Record<string, unknown>).label ??
                    `Item ${index + 1}`,
                )
              : String(item)

          return <span key={`${label}-${index}`}>{label}</span>
        })}
      </div>
    )
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const readable = record.name ?? record.title ?? record.label
    return readable ? String(readable) : <span className="muted">Structured data</span>
  }

  if (
    typeof value === 'string' &&
    /(At|Date)$/i.test(key) &&
    !Number.isNaN(Date.parse(value))
  ) {
    return formatDate(value, true)
  }

  return String(value)
}

export default function AdminUserDetailsPage() {
  const { id } = useParams()

  const query = useQuery({
    queryKey: ['admin', 'user', id],
    enabled: Boolean(id),
    queryFn: () => getAdminData<Details>(`/admin/users/${id}`),
  })

  if (query.isLoading) {
    return (
      <div className="admin-page">
        <AdminPageHeader
          title="User details"
          subtitle="Account profile, activity, sessions, and financial history."
        />
        <AdminLoading />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <div className="admin-page">
        <AdminPageHeader
          title="User details"
          subtitle="Account profile, activity, sessions, and financial history."
        />
        <AdminError onRetry={() => query.refetch()} />
      </div>
    )
  }

  const { user, profile, bookings, metrics } = query.data
  const profileEntries = Object.entries(profile ?? {}).filter(
    ([key]) => !hiddenProfileKeys.has(key),
  )

  return (
    <div className="admin-page admin-user-details-page">
      <AdminPageHeader
        title={user.name}
        subtitle={`${user.email} · Joined ${formatDate(user.createdAt)}`}
        actions={
          <Link className="button button-secondary" to="/admin/users">
            <ArrowLeft size={16} />
            Back to users
          </Link>
        }
      />

      <Card className="admin-profile-hero">
        <div className="admin-profile-avatar" aria-hidden="true">
          {user.avatar ? <img src={user.avatar} alt="" /> : user.name.charAt(0).toUpperCase()}
        </div>

        <div className="admin-profile-copy">
          <div className="admin-profile-badges">
            <StatusBadge value={user.role} />
            <StatusBadge value={user.isActive ? 'active' : 'inactive'} />
            <StatusBadge value={user.isEmailVerified ? 'verified' : 'unverified'} />
          </div>

          <h2>{user.name}</h2>

          <div className="admin-profile-contact-list">
            <span>
              <Mail size={15} />
              {user.email}
            </span>
            <span>
              <Phone size={15} />
              {String(user.phone ?? 'No phone added')}
            </span>
          </div>

          {user.banReason && (
            <div className="alert error admin-profile-alert">
              Restriction reason: {String(user.banReason)}
            </div>
          )}
        </div>
      </Card>

      <div className="admin-metric-grid admin-metric-grid-four compact">
        <StatCard
          label="Bookings"
          value={metrics.bookingCount}
          icon={<CalendarDays />}
        />
        <StatCard
          label="Practice sessions"
          value={metrics.practiceCount}
          icon={<Clock3 />}
        />
        <StatCard
          label="Active sign-ins"
          value={metrics.activeSessions}
          icon={<ShieldCheck />}
        />
        <StatCard
          label="Paid value"
          value={formatMoney(metrics.fees.paid)}
          icon={<CircleDollarSign />}
        />
      </div>

      <div className="admin-two-column admin-user-detail-columns">
        <Card className="admin-detail-card">
          <div className="admin-card-heading">
            <div>
              <h3>Account details</h3>
              <p className="muted">Authentication and account lifecycle information.</p>
            </div>
          </div>

          <dl className="admin-definition-list">
            <div>
              <dt>Role</dt>
              <dd><StatusBadge value={user.role} /></dd>
            </div>
            <div>
              <dt>Provider</dt>
              <dd>{String(user.authProvider ?? 'local')}</dd>
            </div>
            <div>
              <dt>Last login</dt>
              <dd>{formatDate(user.lastLoginAt as string | null, true)}</dd>
            </div>
            <div>
              <dt>Email verified</dt>
              <dd>{formatDate(user.emailVerifiedAt as string | null, true)}</dd>
            </div>
            <div>
              <dt>Password changed</dt>
              <dd>{formatDate(user.lastPasswordChangeAt as string | null, true)}</dd>
            </div>
            <div>
              <dt>Pending fees</dt>
              <dd>{formatMoney(metrics.fees.pending)}</dd>
            </div>
            <div>
              <dt>Refunded value</dt>
              <dd>{formatMoney(metrics.fees.refunded)}</dd>
            </div>
            <div>
              <dt>Account created</dt>
              <dd>{formatDate(user.createdAt, true)}</dd>
            </div>
          </dl>
        </Card>

        <Card className="admin-detail-card">
          <div className="admin-card-heading">
            <div>
              <h3>Role profile</h3>
              <p className="muted">Learning or teaching data attached to this account.</p>
            </div>
          </div>

          {!profile || profileEntries.length === 0 ? (
            <div className="admin-inline-empty">
              No separate role profile is attached to this account.
            </div>
          ) : (
            <dl className="admin-profile-field-grid">
              {profileEntries.map(([key, value]) => (
                <div key={key}>
                  <dt>{formatProfileLabel(key)}</dt>
                  <dd>{renderProfileValue(key, value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      </div>

      <Card className="admin-detail-card admin-bookings-card">
        <div className="admin-card-heading">
          <div>
            <h3>Recent bookings</h3>
            <p className="muted">Latest sessions and payment states for this account.</p>
          </div>
          <span className="admin-count-pill">{bookings.length}</span>
        </div>

        {bookings.length === 0 ? (
          <AdminEmpty
            title="No bookings"
            message="This account has no booking history."
          />
        ) : (
          <AdminTable
            headers={[
              'Subject',
              'Student',
              'Teacher',
              'Schedule',
              'Status',
              'Payment',
            ]}
          >
            {bookings.map((booking) => (
              <tr key={booking._id}>
                <td>
                  <strong>{booking.subjectId?.name ?? 'Subject'}</strong>
                  <small>{booking.topicName}</small>
                </td>
                <td>{booking.studentId?.name ?? '—'}</td>
                <td>{booking.teacherId?.name ?? '—'}</td>
                <td>{formatDate(booking.scheduledAt, true)}</td>
                <td><StatusBadge value={booking.status} /></td>
                <td><StatusBadge value={booking.paymentStatus} /></td>
              </tr>
            ))}
          </AdminTable>
        )}
      </Card>
    </div>
  )
}
