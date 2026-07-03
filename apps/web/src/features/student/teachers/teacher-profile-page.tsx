import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GraduationCap,
  IndianRupee,
  Languages,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { Card } from '../../../components/ui'
import { api } from '../../../lib/api'
import { BookingDoubtPollSelector } from './booking-doubt-poll-selector'
import type {
  SubjectOption,
  TeacherPublicProfileResponse,
  TeacherReview,
  TeacherSlotPreview,
} from './types'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function dateKey(value: string): string {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(value: string, compact = false): string {
  return new Date(value).toLocaleDateString('en-IN', {
    weekday: compact ? 'short' : 'long',
    day: 'numeric',
    month: compact ? 'short' : 'long',
  })
}

function formatTime(value: string): string {
  return new Date(`2000-01-01T${value}:00`).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatResponseTime(minutes: number): string {
  if (!minutes) return 'Usually replies soon'
  if (minutes < 60) return `Usually replies in ${minutes} min`
  const hours = Math.round(minutes / 60)
  return `Usually replies in ${hours} hr${hours === 1 ? '' : 's'}`
}

function RatingStars({ rating }: { rating: number }) {
  const rounded = Math.round(rating)
  return (
    <span className="teacher-profile-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={17}
          fill={value <= rounded ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  )
}

function ReviewCard({ review }: { review: TeacherReview }) {
  return (
    <article className="teacher-review-card">
      <div className="teacher-review-head">
        <div className="teacher-review-avatar" aria-hidden="true">
          {review.student.avatar ? (
            <img src={review.student.avatar} alt="" />
          ) : (
            getInitials(review.student.name)
          )}
        </div>
        <div>
          <strong>{review.student.name}</strong>
          <div className="teacher-review-rating">
            <RatingStars rating={review.rating} />
            <span>{review.rating.toFixed(1)}</span>
          </div>
        </div>
        <time dateTime={review.createdAt}>
          {new Date(review.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </time>
      </div>
      <p>{review.review}</p>
    </article>
  )
}

function LoadingProfile() {
  return (
    <div className="teacher-profile-loading" aria-label="Loading teacher profile">
      <div className="skeleton teacher-profile-loading-hero" />
      <div className="teacher-profile-content-grid">
        <div className="teacher-profile-loading-column">
          <div className="skeleton teacher-profile-loading-card" />
          <div className="skeleton teacher-profile-loading-card" />
        </div>
        <div className="skeleton teacher-profile-loading-booking" />
      </div>
    </div>
  )
}

export function TeacherProfilePage() {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const bookingRef = useRef<HTMLDivElement>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedTopicId, setSelectedTopicId] = useState('')
  const [customTopic, setCustomTopic] = useState('')
  const [selectedDoubtPollId, setSelectedDoubtPollId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState('')

  const profileQuery = useQuery({
    queryKey: ['teacher-profile', id],
    enabled: Boolean(id),
    queryFn: () =>
      api
        .get<{ data: TeacherPublicProfileResponse }>(`/teachers/${id}`)
        .then((response) => response.data.data),
  })

  const subjectsQuery = useQuery({
    queryKey: ['subjects', 'teacher-booking-topics'],
    queryFn: () =>
      api
        .get<{ data: SubjectOption[] }>('/subjects')
        .then((response) => response.data.data),
    staleTime: 5 * 60 * 1000,
  })

  const data = profileQuery.data
  const teacher = data?.teacher

  const availableDates = useMemo(() => {
    const uniqueDates = new Map<string, string>()
    for (const slot of data?.slots ?? []) {
      const key = dateKey(slot.date)
      if (!uniqueDates.has(key)) uniqueDates.set(key, slot.date)
    }
    return [...uniqueDates.entries()].slice(0, 7)
  }, [data?.slots])

  const matchingSlots = useMemo(() => {
    return (data?.slots ?? []).filter((slot) => {
      if (selectedDate && dateKey(slot.date) !== selectedDate) return false
      if (
        selectedSubjectId &&
        slot.subjectIds.length > 0 &&
        !slot.subjectIds.includes(selectedSubjectId)
      ) {
        return false
      }
      return true
    })
  }, [data?.slots, selectedDate, selectedSubjectId])

  const selectedSlot = useMemo(
    () => (data?.slots ?? []).find((slot) => slot.id === selectedSlotId) ?? null,
    [data?.slots, selectedSlotId],
  )

  const selectedSubjectCatalog = useMemo(
    () =>
      (subjectsQuery.data ?? []).find(
        (subject) => subject._id === selectedSubjectId,
      ) ?? null,
    [selectedSubjectId, subjectsQuery.data],
  )

  const availableTopics = useMemo(
    () =>
      (selectedSubjectCatalog?.topics ?? [])
        .filter((topic) => topic.isActive !== false)
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
    [selectedSubjectCatalog],
  )

  useEffect(() => {
    if (!teacher) return
    setSelectedSubjectId((current) => current || teacher.subjects[0]?.id || '')
  }, [teacher])

  useEffect(() => {
    if (!availableDates.length) return
    setSelectedDate((current) => current || availableDates[0]?.[0] || '')
  }, [availableDates])

  useEffect(() => {
    if (
      selectedSlotId &&
      !matchingSlots.some((slot) => slot.id === selectedSlotId)
    ) {
      setSelectedSlotId('')
    }
  }, [matchingSlots, selectedSlotId])

  useEffect(() => {
    if (data && searchParams.get('book') === '1') {
      window.setTimeout(() => {
        bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
    }
  }, [data, searchParams])

  if (profileQuery.isLoading) return <LoadingProfile />

  if (profileQuery.isError || !data || !teacher) {
    return (
      <Card className="teacher-profile-error">
        <UsersRound size={38} />
        <h1>Teacher profile unavailable</h1>
        <p className="muted">
          This teacher may no longer be available, or the profile could not be
          loaded right now.
        </p>
        <button
          type="button"
          className="button"
          onClick={() => profileQuery.refetch()}
        >
          Try again
        </button>
        <Link className="button button-secondary" to="/student/teachers">
          Back to teachers
        </Link>
      </Card>
    )
  }

  const selectedSubject =
    teacher.subjects.find((subject) => subject.id === selectedSubjectId) ?? null

  const selectedTopic =
    selectedTopicId && selectedTopicId !== 'custom'
      ? availableTopics.find((topic) => topic._id === selectedTopicId) ?? null
      : null
  const selectedTopicName =
    selectedTopicId === 'custom' ? customTopic.trim() : selectedTopic?.name ?? ''
  const topicSelectionComplete = Boolean(selectedTopicName)

  const checkoutParams = new URLSearchParams()
  checkoutParams.set('teacherId', teacher.id)
  if (selectedSubjectId) checkoutParams.set('subjectId', selectedSubjectId)
  if (selectedTopicId && selectedTopicId !== 'custom') {
    checkoutParams.set('topicId', selectedTopicId)
  }
  if (selectedTopicName) checkoutParams.set('topicName', selectedTopicName)
  if (selectedTopicId === 'custom') checkoutParams.set('customTopic', '1')
  if (selectedDoubtPollId) checkoutParams.set('doubtPollId', selectedDoubtPollId)
  if (selectedSlotId) checkoutParams.set('slotId', selectedSlotId)

  return (
    <div className="teacher-profile-page">
      <div className="teacher-profile-nav">
        <Link to="/student/teachers">
          <ArrowLeft size={18} /> Back to teachers
        </Link>
        <Link className="button button-secondary" to="/student/sessions">
          <CalendarClock size={18} /> My sessions
        </Link>
      </div>

      <section className="teacher-profile-hero">
        <div className="teacher-profile-avatar" aria-hidden="true">
          {teacher.avatar ? (
            <img src={teacher.avatar} alt="" />
          ) : (
            getInitials(teacher.name)
          )}
        </div>
        <div className="teacher-profile-identity">
          <div className="teacher-profile-name-row">
            <div>
              <p className="muted">Verified Edvixa teacher</p>
              <h1>{teacher.name}</h1>
            </div>
            {teacher.verified && (
              <span className="teacher-profile-verified">
                <CheckCircle2 size={15} /> Verified
              </span>
            )}
          </div>

          <p className="teacher-profile-qualification">
            <GraduationCap size={18} />
            {teacher.qualification || 'Edvixa educator'}
          </p>

          <div className="teacher-profile-rating-row">
            <RatingStars rating={teacher.rating} />
            <strong>{teacher.rating.toFixed(1)}</strong>
            <a href="#teacher-reviews">{teacher.totalReviews} reviews</a>
          </div>

          <div className="teacher-profile-subjects">
            {teacher.subjects.map((subject) => (
              <span key={subject.id}>
                <BookOpen size={14} /> {subject.name}
              </span>
            ))}
          </div>
        </div>

        <div className="teacher-profile-hero-stats">
          <div>
            <IndianRupee size={19} />
            <span>Hourly rate</span>
            <strong>₹{teacher.hourlyRate}</strong>
          </div>
          <div>
            <Award size={19} />
            <span>Experience</span>
            <strong>{teacher.experienceYears} years</strong>
          </div>
          <div>
            <ShieldCheck size={19} />
            <span>Sessions completed</span>
            <strong>{teacher.totalSessionsCompleted}</strong>
          </div>
        </div>
      </section>

      <div className="teacher-profile-content-grid">
        <main className="teacher-profile-main-column">
          <Card className="teacher-profile-section-card">
            <div className="teacher-profile-section-heading">
              <div className="teacher-profile-section-icon">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="muted">About this teacher</p>
                <h2>Teaching approach</h2>
              </div>
            </div>
            <p className="teacher-profile-bio">
              {teacher.bio ||
                'Personalised one-to-one teaching focused on confidence, clarity, and measurable progress.'}
            </p>
            <div className="teacher-profile-detail-grid">
              <div>
                <Languages size={19} />
                <span>Languages</span>
                <strong>
                  {teacher.languages.length
                    ? teacher.languages.join(', ')
                    : 'English'}
                </strong>
              </div>
              <div>
                <UsersRound size={19} />
                <span>Students taught</span>
                <strong>{teacher.totalStudentsTaught}</strong>
              </div>
              <div>
                <Clock3 size={19} />
                <span>Response time</span>
                <strong>
                  {formatResponseTime(teacher.averageResponseTimeMinutes)}
                </strong>
              </div>
            </div>
          </Card>

          <section id="teacher-reviews" className="teacher-profile-review-section">
            <Card className="teacher-profile-section-card">
            <div className="teacher-profile-reviews-heading">
              <div className="teacher-profile-section-heading">
                <div className="teacher-profile-section-icon purple">
                  <MessageSquareText size={20} />
                </div>
                <div>
                  <p className="muted">Student feedback</p>
                  <h2>Ratings and reviews</h2>
                </div>
              </div>
              <div className="teacher-profile-review-summary">
                <strong>{data.reviewSummary.rating.toFixed(1)}</strong>
                <div>
                  <RatingStars rating={data.reviewSummary.rating} />
                  <span>{data.reviewSummary.totalReviews} total reviews</span>
                </div>
              </div>
            </div>

            {data.reviews.length ? (
              <div className="teacher-review-list">
                {data.reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="teacher-profile-empty-reviews">
                <MessageSquareText size={30} />
                <strong>No public reviews yet</strong>
                <p className="muted">
                  This teacher has not received a visible written review yet.
                </p>
              </div>
            )}
            </Card>
          </section>
        </main>

        <aside className="teacher-profile-booking-column" ref={bookingRef}>
          <Card className="teacher-profile-booking-card">
            <div className="teacher-profile-booking-title">
              <div>
                <p className="muted">Book a one-hour lesson</p>
                <h2>Select your session</h2>
              </div>
              <span>₹{teacher.hourlyRate}</span>
            </div>

            <label className="teacher-profile-subject-select">
              Subject
              <select
                value={selectedSubjectId}
                onChange={(event) => {
                  setSelectedSubjectId(event.target.value)
                  setSelectedTopicId('')
                  setCustomTopic('')
                  setSelectedDoubtPollId('')
                  setSelectedSlotId('')
                }}
              >
                {teacher.subjects.map((subject) => (
                  <option value={subject.id} key={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="teacher-profile-topic-section">
              <label className="teacher-profile-topic-select">
                Chapter / Topic
                <select
                  value={selectedTopicId}
                  disabled={subjectsQuery.isLoading}
                  onChange={(event) => {
                    setSelectedTopicId(event.target.value)
                    setSelectedDoubtPollId('')
                    if (event.target.value !== 'custom') setCustomTopic('')
                  }}
                >
                  <option value="">
                    {subjectsQuery.isLoading
                      ? 'Loading chapters...'
                      : 'Select a chapter or topic'}
                  </option>
                  {availableTopics.map((topic) => (
                    <option value={topic._id} key={topic._id}>
                      {topic.name}
                    </option>
                  ))}
                  <option value="custom">Other / Custom topic</option>
                </select>
              </label>

              {selectedTopicId === 'custom' && (
                <label className="teacher-profile-custom-topic">
                  Describe the chapter or doubt
                  <input
                    type="text"
                    value={customTopic}
                    maxLength={120}
                    placeholder="Example: Current electricity — Kirchhoff's laws"
                    onChange={(event) => { setCustomTopic(event.target.value); setSelectedDoubtPollId('') }}
                  />
                </label>
              )}

              {!subjectsQuery.isLoading && !availableTopics.length && (
                <p className="teacher-profile-topic-help">
                  No preset chapters are available for this subject. Choose
                  Other / Custom topic and describe what you need help with.
                </p>
              )}
              {availableTopics.length > 0 && (
                <p className="teacher-profile-topic-help">
                  Select the exact chapter you want the teacher to cover in this
                  one-hour session.
                </p>
              )}
            </div>

            {topicSelectionComplete && (
              <BookingDoubtPollSelector
                subjectId={selectedSubjectId}
                topicId={selectedTopicId !== 'custom' ? selectedTopicId : undefined}
                topicName={selectedTopicName}
                selectedPollId={selectedDoubtPollId}
                onSelectedPollIdChange={setSelectedDoubtPollId}
              />
            )}

            <div className="teacher-profile-date-section">
              <div className="teacher-profile-booking-label">
                <span>Date</span>
                <small>Timezone: {teacher.timezone}</small>
              </div>
              {availableDates.length ? (
                <div className="teacher-profile-date-options">
                  {availableDates.map(([key, value]) => (
                    <button
                      type="button"
                      key={key}
                      className={selectedDate === key ? 'selected' : ''}
                      onClick={() => {
                        setSelectedDate(key)
                        setSelectedSlotId('')
                      }}
                    >
                      <span>
                        {new Date(value).toLocaleDateString('en-IN', {
                          weekday: 'short',
                        })}
                      </span>
                      <strong>
                        {new Date(value).toLocaleDateString('en-IN', {
                          day: 'numeric',
                        })}
                      </strong>
                      <small>
                        {new Date(value).toLocaleDateString('en-IN', {
                          month: 'short',
                        })}
                      </small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="teacher-profile-no-dates">
                  No upcoming dates are currently available.
                </div>
              )}
            </div>

            <div className="teacher-profile-slot-section">
              <div className="teacher-profile-booking-label">
                <span>Available times</span>
                <small>{matchingSlots.length} slots</small>
              </div>
              {matchingSlots.length ? (
                <div className="teacher-profile-slot-options">
                  {matchingSlots.map((slot) => (
                    <button
                      type="button"
                      key={slot.id}
                      className={selectedSlotId === slot.id ? 'selected' : ''}
                      onClick={() => setSelectedSlotId(slot.id)}
                    >
                      <Clock3 size={16} />
                      <span>{formatTime(slot.startTime)}</span>
                      <small>to {formatTime(slot.endTime)}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="teacher-profile-no-slots">
                  <CalendarClock size={25} />
                  <strong>No matching slots</strong>
                  <p>
                    Choose another date or subject to see more availability.
                  </p>
                </div>
              )}
            </div>

            <div className="teacher-profile-booking-summary">
              <div>
                <span>Teacher</span>
                <strong>{teacher.name}</strong>
              </div>
              <div>
                <span>Subject</span>
                <strong>{selectedSubject?.name ?? 'Select a subject'}</strong>
              </div>
              <div>
                <span>Chapter / Topic</span>
                <strong>{selectedTopicName || 'Choose a chapter'}</strong>
              </div>
              <div>
                <span>Doubt poll</span>
                <strong>{selectedDoubtPollId ? 'Joined and selected' : 'Choose or create a poll'}</strong>
              </div>
              <div>
                <span>Session</span>
                <strong>
                  {selectedSlot
                    ? `${formatDate(selectedSlot.date, true)} · ${formatTime(selectedSlot.startTime)}`
                    : 'Choose a time'}
                </strong>
              </div>
              <div className="teacher-profile-booking-total">
                <span>Total</span>
                <strong>₹{teacher.hourlyRate}</strong>
              </div>
            </div>

            {selectedSlotId && topicSelectionComplete && selectedDoubtPollId ? (
              <Link
                className="button teacher-profile-checkout-button"
                to={`/student/checkout?${checkoutParams.toString()}`}
              >
                Continue to checkout <ChevronRight size={18} />
              </Link>
            ) : (
              <button
                className="button teacher-profile-checkout-button"
                type="button"
                disabled
              >
                {!topicSelectionComplete
                  ? selectedTopicId === 'custom'
                    ? 'Enter your topic to continue'
                    : 'Select a chapter to continue'
                  : !selectedDoubtPollId
                    ? 'Join or create a doubt poll'
                    : 'Select a time to continue'}
              </button>
            )}

            <p className="teacher-profile-booking-note">
              <ShieldCheck size={15} /> Your slot is confirmed only after checkout.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  )
}
