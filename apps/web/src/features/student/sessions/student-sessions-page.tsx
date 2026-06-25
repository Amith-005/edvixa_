import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  IndianRupee,
  Link2,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  Search,
  Star,
  UserRound,
  Video,
  X,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge, Button, Card, Input, StatCard } from '../../../components/ui'
import { api } from '../../../lib/api'
import type { TeacherPublicProfileResponse } from '../teachers/types'
import type {
  StudentSession,
  StudentSessionsResponse,
  StudentSessionStatus,
} from './types'

const tabs: Array<{ value: StudentSessionStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function extractError(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const response = (
      error as {
        response?: { data?: { message?: string; error?: { message?: string } } }
      }
    ).response
    return response?.data?.message ?? response?.data?.error?.message ?? fallback
  }
  return fallback
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatSessionDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusTone(
  status: StudentSession['displayStatus'],
): 'success' | 'warning' | 'danger' | 'purple' {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'danger'
  if (status === 'pending') return 'warning'
  return 'purple'
}

function paymentTone(
  status: string,
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'paid') return 'success'
  if (status === 'failed' || status === 'refunded') return 'danger'
  if (status === 'pending') return 'warning'
  return 'neutral'
}

function countForTab(
  tab: StudentSessionStatus,
  summary: StudentSessionsResponse['summary'] | undefined,
): number {
  if (!summary) return 0
  if (tab === 'all') return summary.total
  return summary[tab]
}

function getJoinLabel(session: StudentSession): string {
  if (session.meeting.canJoin) return 'Join session'
  if (session.meeting.joinState === 'too_early') {
    return `Join ${formatTime(session.meeting.joinAvailableAt)}`
  }
  if (session.meeting.joinState === 'ended') return 'Session ended'
  return 'Meeting link pending'
}

export function StudentSessionsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<StudentSessionStatus>('all')
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [cancelSession, setCancelSession] = useState<StudentSession | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [rescheduleSession, setRescheduleSession] =
    useState<StudentSession | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [reviewSession, setReviewSession] = useState<StudentSession | null>(null)
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  const sessionsQuery = useQuery({
    queryKey: ['student-sessions', activeTab, search],
    queryFn: () =>
      api
        .get<{ success: true; data: StudentSessionsResponse }>('/bookings', {
          params: { status: activeTab, search },
        })
        .then((response) => response.data.data),
  })

  const teacherProfileQuery = useQuery({
    queryKey: ['teacher-profile', rescheduleSession?.teacher.profileId],
    enabled: Boolean(rescheduleSession?.teacher.profileId),
    queryFn: () =>
      api
        .get<{ success: true; data: TeacherPublicProfileResponse }>(
          `/teachers/${rescheduleSession!.teacher.profileId}`,
        )
        .then((response) => response.data.data),
  })

  const availableSlots = useMemo(() => {
    if (!rescheduleSession || !teacherProfileQuery.data) return []
    return teacherProfileQuery.data.slots.filter(
      (slot) =>
        slot.subjectIds.length === 0 ||
        slot.subjectIds.includes(rescheduleSession.subject.id),
    )
  }, [rescheduleSession, teacherProfileQuery.data])

  const invalidateSessions = async () => {
    await queryClient.invalidateQueries({ queryKey: ['student-sessions'] })
    await queryClient.invalidateQueries({ queryKey: ['student-dashboard'] })
  }

  const cancelMutation = useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      api.patch(`/bookings/${input.id}/cancel`, { reason: input.reason }),
    onSuccess: async () => {
      setCancelSession(null)
      setCancelReason('')
      setActionMessage('Session cancelled. Any eligible refund is now pending review.')
      await invalidateSessions()
    },
  })

  const rescheduleMutation = useMutation({
    mutationFn: (input: { id: string; slotId: string; reason: string }) =>
      api.patch(`/bookings/${input.id}/reschedule`, {
        slotId: input.slotId,
        reason: input.reason,
      }),
    onSuccess: async () => {
      setRescheduleSession(null)
      setSelectedSlotId('')
      setRescheduleReason('')
      setActionMessage('Session rescheduled successfully.')
      await invalidateSessions()
    },
  })

  const reviewMutation = useMutation({
    mutationFn: (input: {
      id: string
      rating: number
      review: string
    }) =>
      api.post(`/bookings/${input.id}/review`, {
        rating: input.rating,
        review: input.review,
      }),
    onSuccess: async () => {
      setReviewSession(null)
      setRating(5)
      setReviewText('')
      setActionMessage('Thank you. Your teacher review has been submitted.')
      await invalidateSessions()
      await queryClient.invalidateQueries({ queryKey: ['teacher-profile'] })
      await queryClient.invalidateQueries({ queryKey: ['teacher-discovery'] })
    },
  })

  const downloadReceipt = async (session: StudentSession) => {
    try {
      const response = await api.get(`/bookings/${session.id}/receipt`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(response.data as Blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `edvixa-receipt-${session.id}.txt`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setActionMessage(extractError(error, 'Could not download the receipt.'))
    }
  }

  const applySearch = () => setSearch(searchDraft.trim())
  const clearSearch = () => {
    setSearchDraft('')
    setSearch('')
  }

  const summary = sessionsQuery.data?.summary

  return (
    <div className="student-sessions-page">
      <div className="page-header student-sessions-header">
        <div>
          <p className="muted">Student · Sessions</p>
          <h1>My sessions</h1>
          <p className="muted">
            Manage your lessons, meeting links, receipts, and teacher feedback.
          </p>
        </div>
        <Link to="/student/teachers">
          <Button>
            <CalendarClock size={18} /> Book new session
          </Button>
        </Link>
      </div>

      <div className="stat-grid student-session-stats">
        <StatCard
          label="Upcoming"
          value={summary?.upcoming ?? 0}
          icon={<CalendarDays />}
          detail="Confirmed future sessions"
        />
        <StatCard
          label="Pending"
          value={summary?.pending ?? 0}
          icon={<Clock3 />}
          detail="Awaiting payment or confirmation"
        />
        <StatCard
          label="Completed"
          value={summary?.completed ?? 0}
          icon={<CheckCircle2 />}
          detail="Finished lessons"
        />
        <StatCard
          label="Investment"
          value={formatCurrency(summary?.investment ?? 0)}
          icon={<IndianRupee />}
          detail="Paid learning sessions"
        />
      </div>

      {actionMessage ? (
        <div className="student-session-notice" role="status">
          <CheckCircle2 size={18} />
          <span>{actionMessage}</span>
          <button type="button" onClick={() => setActionMessage('')}>
            <X size={16} />
          </button>
        </div>
      ) : null}

      <Card className="student-session-toolbar">
        <div className="student-session-tabs" aria-label="Session status filters">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={activeTab === tab.value ? 'active' : ''}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
              <span>{countForTab(tab.value, summary)}</span>
            </button>
          ))}
        </div>
        <div className="student-session-search">
          <Search size={17} />
          <Input
            aria-label="Search sessions"
            value={searchDraft}
            placeholder="Search teacher, subject, or chapter"
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applySearch()
            }}
          />
          <Button type="button" onClick={applySearch}>
            Search
          </Button>
          {search ? (
            <Button type="button" className="button-secondary" onClick={clearSearch}>
              Clear
            </Button>
          ) : null}
        </div>
      </Card>

      {sessionsQuery.isLoading ? (
        <div className="student-session-list">
          {[1, 2, 3].map((value) => (
            <div className="skeleton student-session-skeleton" key={value} />
          ))}
        </div>
      ) : sessionsQuery.isError ? (
        <Card className="student-session-error">
          <AlertTriangle size={34} />
          <div>
            <h3>Could not load your sessions</h3>
            <p className="muted">Check that the API and MongoDB are running.</p>
          </div>
          <Button type="button" onClick={() => sessionsQuery.refetch()}>
            <RefreshCw size={17} /> Retry
          </Button>
        </Card>
      ) : sessionsQuery.data?.items.length ? (
        <div className="student-session-list">
          {sessionsQuery.data.items.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onCancel={() => {
                setCancelReason('')
                setCancelSession(session)
              }}
              onReschedule={() => {
                setSelectedSlotId('')
                setRescheduleReason('')
                setRescheduleSession(session)
              }}
              onReview={() => {
                setRating(5)
                setReviewText('')
                setReviewSession(session)
              }}
              onDownload={() => void downloadReceipt(session)}
            />
          ))}
        </div>
      ) : (
        <Card className="student-session-empty">
          <CalendarDays size={42} />
          <h2>No sessions found</h2>
          <p className="muted">
            {search
              ? 'Try a different search or clear the current filter.'
              : activeTab === 'all'
                ? 'Book your first one-to-one lesson with an Edvixa teacher.'
                : `You have no ${activeTab} sessions.`}
          </p>
          <Link to="/student/teachers">
            <Button>
              <CalendarClock size={18} /> Find a teacher
            </Button>
          </Link>
        </Card>
      )}

      {cancelSession ? (
        <SessionModal title="Cancel session" onClose={() => setCancelSession(null)}>
          <div className="student-session-modal-warning">
            <AlertTriangle size={22} />
            <p>
              Cancel your {cancelSession.subject.name} lesson with{' '}
              <strong>{cancelSession.teacher.name}</strong>? Paid bookings are sent
              for refund review according to the cancellation policy.
            </p>
          </div>
          <label className="student-session-field">
            Reason <span>(optional)</span>
            <textarea
              value={cancelReason}
              maxLength={300}
              placeholder="Tell the teacher why you need to cancel."
              onChange={(event) => setCancelReason(event.target.value)}
            />
          </label>
          {cancelMutation.isError ? (
            <div className="alert error">
              {extractError(cancelMutation.error, 'Could not cancel this session.')}
            </div>
          ) : null}
          <div className="student-session-modal-actions">
            <Button
              type="button"
              className="button-secondary"
              onClick={() => setCancelSession(null)}
            >
              Keep session
            </Button>
            <Button
              type="button"
              className="student-session-danger-button"
              disabled={cancelMutation.isPending}
              onClick={() =>
                cancelMutation.mutate({
                  id: cancelSession.id,
                  reason: cancelReason,
                })
              }
            >
              {cancelMutation.isPending ? (
                <LoaderCircle className="student-session-spin" size={17} />
              ) : (
                <XCircle size={17} />
              )}
              Confirm cancellation
            </Button>
          </div>
        </SessionModal>
      ) : null}

      {rescheduleSession ? (
        <SessionModal
          title="Reschedule session"
          onClose={() => setRescheduleSession(null)}
          wide
        >
          <p className="muted">
            Choose another available slot with {rescheduleSession.teacher.name}.
            Your subject and chapter remain unchanged.
          </p>
          {teacherProfileQuery.isLoading ? (
            <div className="skeleton student-session-modal-skeleton" />
          ) : teacherProfileQuery.isError ? (
            <div className="alert error">Could not load available time slots.</div>
          ) : availableSlots.length ? (
            <div className="student-session-slot-grid">
              {availableSlots.map((slot) => {
                const start = new Date(slot.date)
                const [hours = '0', minutes = '0'] = slot.startTime.split(':')
                start.setHours(Number(hours), Number(minutes), 0, 0)
                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={selectedSlotId === slot.id ? 'selected' : ''}
                    onClick={() => setSelectedSlotId(slot.id)}
                  >
                    <CalendarDays size={17} />
                    <span>
                      <strong>{formatSessionDate(start.toISOString())}</strong>
                      <small>
                        {formatTime(start.toISOString())} · {slot.timezone}
                      </small>
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="student-session-modal-empty">
              No other compatible slots are currently available.
            </div>
          )}
          <label className="student-session-field">
            Reason <span>(optional)</span>
            <textarea
              value={rescheduleReason}
              maxLength={300}
              placeholder="Add a short note about the schedule change."
              onChange={(event) => setRescheduleReason(event.target.value)}
            />
          </label>
          {rescheduleMutation.isError ? (
            <div className="alert error">
              {extractError(
                rescheduleMutation.error,
                'Could not reschedule this session.',
              )}
            </div>
          ) : null}
          <div className="student-session-modal-actions">
            <Button
              type="button"
              className="button-secondary"
              onClick={() => setRescheduleSession(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selectedSlotId || rescheduleMutation.isPending}
              onClick={() =>
                rescheduleMutation.mutate({
                  id: rescheduleSession.id,
                  slotId: selectedSlotId,
                  reason: rescheduleReason,
                })
              }
            >
              {rescheduleMutation.isPending ? (
                <LoaderCircle className="student-session-spin" size={17} />
              ) : (
                <RotateCcw size={17} />
              )}
              Confirm new time
            </Button>
          </div>
        </SessionModal>
      ) : null}

      {reviewSession ? (
        <SessionModal title="Review your teacher" onClose={() => setReviewSession(null)}>
          <p className="muted">
            Share feedback about your lesson with {reviewSession.teacher.name}.
          </p>
          <div className="student-session-rating" aria-label={`${rating} stars`}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                type="button"
                key={value}
                className={value <= rating ? 'active' : ''}
                aria-label={`${value} star${value === 1 ? '' : 's'}`}
                onClick={() => setRating(value)}
              >
                <Star size={28} fill={value <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <label className="student-session-field">
            Your review
            <textarea
              value={reviewText}
              maxLength={1200}
              placeholder="What was useful about this session?"
              onChange={(event) => setReviewText(event.target.value)}
            />
          </label>
          {reviewMutation.isError ? (
            <div className="alert error">
              {extractError(reviewMutation.error, 'Could not submit your review.')}
            </div>
          ) : null}
          <div className="student-session-modal-actions">
            <Button
              type="button"
              className="button-secondary"
              onClick={() => setReviewSession(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={reviewText.trim().length < 5 || reviewMutation.isPending}
              onClick={() =>
                reviewMutation.mutate({
                  id: reviewSession.id,
                  rating,
                  review: reviewText,
                })
              }
            >
              {reviewMutation.isPending ? (
                <LoaderCircle className="student-session-spin" size={17} />
              ) : (
                <MessageSquareText size={17} />
              )}
              Submit review
            </Button>
          </div>
        </SessionModal>
      ) : null}
    </div>
  )
}

function SessionCard({
  session,
  onCancel,
  onReschedule,
  onReview,
  onDownload,
}: {
  session: StudentSession
  onCancel: () => void
  onReschedule: () => void
  onReview: () => void
  onDownload: () => void
}) {
  const avatarInitials = session.teacher.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

  return (
    <Card className={`student-session-card status-${session.displayStatus}`}>
      <div className="student-session-card-main">
        <div className="student-session-avatar">
          {session.teacher.avatar ? (
            <img src={session.teacher.avatar} alt="" />
          ) : (
            avatarInitials
          )}
        </div>
        <div className="student-session-card-copy">
          <div className="student-session-card-title">
            <div>
              <div className="student-session-badges">
                <Badge tone={statusTone(session.displayStatus)}>
                  {session.displayStatus}
                </Badge>
                <Badge tone={paymentTone(session.paymentStatus)}>
                  Payment {session.paymentStatus}
                </Badge>
                {session.rescheduleCount ? (
                  <Badge tone="purple">Rescheduled ×{session.rescheduleCount}</Badge>
                ) : null}
              </div>
              <h2>{session.topicName}</h2>
              <p className="muted">
                {session.subject.name} · with {session.teacher.name}
              </p>
            </div>
            {session.payment ? (
              <strong className="student-session-price">
                {formatCurrency(session.payment.totalAmount)}
              </strong>
            ) : null}
          </div>

          <div className="student-session-meta-grid">
            <div>
              <CalendarDays size={17} />
              <span>Date</span>
              <strong>{formatSessionDate(session.scheduledAt)}</strong>
            </div>
            <div>
              <Clock3 size={17} />
              <span>Time</span>
              <strong>
                {formatTime(session.scheduledAt)} – {formatTime(session.endAt)}
              </strong>
            </div>
            <div>
              <Video size={17} />
              <span>Meeting</span>
              <strong>
                {session.meeting.provider
                  ? session.meeting.provider.replace('_', ' ')
                  : 'Link pending'}
              </strong>
            </div>
            <div>
              <UserRound size={17} />
              <span>Duration</span>
              <strong>{session.durationMinutes} minutes</strong>
            </div>
          </div>

          {session.studentNote || session.teacherNote ? (
            <div className="student-session-notes">
              {session.studentNote ? (
                <p>
                  <strong>Your note:</strong> {session.studentNote}
                </p>
              ) : null}
              {session.teacherNote ? (
                <p>
                  <strong>Teacher note:</strong> {session.teacherNote}
                </p>
              ) : null}
            </div>
          ) : null}

          {session.displayStatus === 'cancelled' && session.cancellationReason ? (
            <div className="student-session-cancelled-note">
              <XCircle size={16} /> {session.cancellationReason}
              {session.payment?.refundStatus === 'requested'
                ? ' · Refund requested'
                : ''}
            </div>
          ) : null}

          <div className="student-session-actions">
            {session.displayStatus === 'upcoming' ? (
              session.meeting.canJoin && session.meeting.link ? (
                <a
                  className="button student-session-join-button"
                  href={session.meeting.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Video size={17} /> Join session
                </a>
              ) : (
                <Button type="button" disabled title={getJoinLabel(session)}>
                  <Video size={17} /> {getJoinLabel(session)}
                </Button>
              )
            ) : null}
            <Link
              className="button button-secondary"
              to={`/student/teachers/${session.teacher.profileId}`}
            >
              <ExternalLink size={17} /> View teacher
            </Link>
            {session.canReschedule ? (
              <Button type="button" className="button-secondary" onClick={onReschedule}>
                <RotateCcw size={17} /> Reschedule
              </Button>
            ) : null}
            {session.canCancel ? (
              <Button type="button" className="button-secondary" onClick={onCancel}>
                <XCircle size={17} /> Cancel
              </Button>
            ) : null}
            {session.canReview ? (
              <Button type="button" onClick={onReview}>
                <Star size={17} /> Add review
              </Button>
            ) : null}
            {session.payment ? (
              <Button type="button" className="button-secondary" onClick={onDownload}>
                <Download size={17} /> Receipt
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  )
}

function SessionModal({
  title,
  onClose,
  wide = false,
  children,
}: {
  title: string
  onClose: () => void
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="student-session-modal-backdrop" role="presentation">
      <section
        className={`student-session-modal${wide ? ' wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <div className="student-session-modal-body">{children}</div>
      </section>
    </div>
  )
}
