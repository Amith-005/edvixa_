import { useQuery } from '@tanstack/react-query'
import {
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  GraduationCap,
  IndianRupee,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  UserRoundSearch,
  UsersRound,
  X,
} from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button, Card, Input, StatCard } from '../../../components/ui'
import { api } from '../../../lib/api'
import type {
  PublicTeacher,
  SubjectOption,
  TeacherDiscoveryResponse,
  TeacherFilters,
} from './types'

const initialFilters: TeacherFilters = {
  search: '',
  subjectId: '',
  date: '',
  maxPrice: '',
  rating: '',
  availability: 'any',
  sort: 'recommended',
}

function formatSlot(teacher: PublicTeacher): string {
  const slot = teacher.nextAvailableSlot
  if (!slot) return 'No upcoming slots'

  const date = new Date(slot.date)
  const dateLabel = date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const time = new Date(`2000-01-01T${slot.startTime}:00`).toLocaleTimeString(
    'en-IN',
    { hour: 'numeric', minute: '2-digit' },
  )
  return `${dateLabel} · ${time}`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function ratingLabel(rating: number): string {
  return rating > 0 ? rating.toFixed(1) : 'New'
}

function TeacherCard({ teacher }: { teacher: PublicTeacher }) {
  const hasSlot = Boolean(teacher.nextAvailableSlot)
  return (
    <Card className="teacher-discovery-card">
      <div className="teacher-card-top">
        <div className="teacher-card-avatar" aria-hidden="true">
          {teacher.avatar ? (
            <img src={teacher.avatar} alt="" />
          ) : (
            getInitials(teacher.name)
          )}
        </div>
        <div className="teacher-card-identity">
          <div className="teacher-card-name-row">
            <h2>{teacher.name}</h2>
            {teacher.verified && (
              <span className="teacher-verified-badge">
                <CheckCircle2 size={14} /> Verified
              </span>
            )}
          </div>
          <p className="muted teacher-qualification">
            {teacher.qualification || 'Edvixa educator'}
          </p>
          <div className="teacher-rating-row">
            <span className="teacher-rating-value">
              <Star size={16} fill="currentColor" /> {ratingLabel(teacher.rating)}
            </span>
            <span>{teacher.totalReviews} reviews</span>
            <span>·</span>
            <span>{teacher.experienceYears} years experience</span>
          </div>
        </div>
      </div>

      <p className="teacher-card-bio">
        {teacher.bio ||
          'Personalised one-to-one teaching focused on confidence and progress.'}
      </p>

      <div className="teacher-subject-chips" aria-label="Subjects taught">
        {teacher.subjects.map((subject) => (
          <span key={subject.id}>
            <BookOpen size={14} /> {subject.name}
          </span>
        ))}
      </div>

      <div className="teacher-card-details">
        <div>
          <span className="teacher-detail-icon">
            <IndianRupee size={18} />
          </span>
          <div>
            <p className="muted">Hourly rate</p>
            <strong>₹{teacher.hourlyRate}</strong>
          </div>
        </div>
        <div>
          <span className="teacher-detail-icon purple">
            <CalendarClock size={18} />
          </span>
          <div>
            <p className="muted">Next available</p>
            <strong>{formatSlot(teacher)}</strong>
          </div>
        </div>
      </div>

      <div className="teacher-card-footer">
        <span className={hasSlot ? 'teacher-available' : 'teacher-unavailable'}>
          <span />
          {hasSlot
            ? `${teacher.availableSlotCount} upcoming slot${teacher.availableSlotCount === 1 ? '' : 's'}`
            : 'Currently unavailable'}
        </span>
        <div className="teacher-card-actions">
          <Link
            className="button button-secondary"
            to={`/student/teachers/${teacher.id}`}
          >
            View profile
          </Link>
          <Link
            className={`button${hasSlot ? '' : ' teacher-button-disabled'}`}
            to={
              hasSlot
                ? `/student/teachers/${teacher.id}?book=1`
                : `/student/teachers/${teacher.id}`
            }
          >
            <CalendarClock size={17} />
            {hasSlot ? 'Book session' : 'View teacher'}
          </Link>
        </div>
      </div>
    </Card>
  )
}

export function TeacherDiscoveryPage() {
  const [draftFilters, setDraftFilters] = useState<TeacherFilters>(initialFilters)
  const [filters, setFilters] = useState<TeacherFilters>(initialFilters)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: '8',
      availability: filters.availability,
      sort: filters.sort,
    })

    if (filters.search.trim()) params.set('search', filters.search.trim())
    if (filters.subjectId) params.set('subjectId', filters.subjectId)
    if (filters.date) params.set('date', filters.date)
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
    if (filters.rating) params.set('rating', filters.rating)
    return params.toString()
  }, [filters, page])

  const subjectsQuery = useQuery({
    queryKey: ['subjects', 'teacher-discovery'],
    queryFn: () =>
      api
        .get<{ data: SubjectOption[] }>('/subjects')
        .then((response) => response.data.data),
  })

  const teachersQuery = useQuery({
    queryKey: ['teacher-discovery', queryString],
    queryFn: () =>
      api
        .get<{ data: TeacherDiscoveryResponse }>(`/teachers?${queryString}`)
        .then((response) => response.data.data),
  })

  const applyFilters = (event?: FormEvent) => {
    event?.preventDefault()
    setFilters(draftFilters)
    setPage(1)
    setFiltersOpen(false)
  }

  const clearFilters = () => {
    setDraftFilters(initialFilters)
    setFilters(initialFilters)
    setPage(1)
    setFiltersOpen(false)
  }

  const data = teachersQuery.data
  const hasAppliedFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'availability') return value !== 'any'
    if (key === 'sort') return value !== 'recommended'
    return Boolean(value)
  })

  return (
    <div className="teacher-discovery-page">
      <div className="page-header teacher-discovery-header">
        <div>
          <p className="muted">Student · Book a teacher</p>
          <h1>Find the right teacher for you</h1>
          <p className="muted">
            Compare verified teachers, explore their expertise, and choose an
            available time.
          </p>
        </div>
        <div className="teacher-header-actions">
          <Link className="button button-secondary" to="/student/sessions">
            <Clock3 size={18} /> My sessions
          </Link>
          <button
            className="button teacher-mobile-filter-button"
            type="button"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal size={18} /> Filters
          </button>
        </div>
      </div>

      {data && (
        <div className="stat-grid teacher-discovery-stats">
          <StatCard
            label="Verified teachers"
            value={data.summary.totalTeachers}
            icon={<UsersRound />}
            detail="Matching your filters"
          />
          <StatCard
            label="With available slots"
            value={data.summary.availableTeachers}
            icon={<CalendarClock />}
            detail="Within the next 30 days"
          />
          <StatCard
            label="Average rating"
            value={data.summary.averageRating || '—'}
            icon={<Star />}
            detail="From student reviews"
          />
          <StatCard
            label="Average hourly rate"
            value={data.summary.averageRate ? `₹${data.summary.averageRate}` : '—'}
            icon={<IndianRupee />}
            detail="Per one-hour session"
          />
        </div>
      )}

      <form
        className={`card teacher-filter-panel${filtersOpen ? ' open' : ''}`}
        onSubmit={applyFilters}
      >
        <div className="teacher-filter-mobile-heading">
          <div>
            <h2>Filter teachers</h2>
            <p className="muted">Choose what matters for your session.</p>
          </div>
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          >
            <X size={21} />
          </button>
        </div>

        <label className="teacher-filter-search">
          Search teacher
          <span>
            <Search size={18} />
            <Input
              value={draftFilters.search}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              placeholder="Name, subject, or qualification"
            />
          </span>
        </label>

        <label>
          Subject
          <select
            className="input"
            value={draftFilters.subjectId}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                subjectId: event.target.value,
              }))
            }
          >
            <option value="">All subjects</option>
            {(subjectsQuery.data ?? []).map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Preferred date
          <Input
            type="date"
            value={draftFilters.date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                date: event.target.value,
              }))
            }
          />
        </label>

        <label>
          Maximum rate
          <span className="teacher-price-input">
            <IndianRupee size={17} />
            <Input
              type="number"
              min="0"
              step="50"
              value={draftFilters.maxPrice}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  maxPrice: event.target.value,
                }))
              }
              placeholder="Any price"
            />
          </span>
        </label>

        <label>
          Minimum rating
          <select
            className="input"
            value={draftFilters.rating}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                rating: event.target.value,
              }))
            }
          >
            <option value="">Any rating</option>
            <option value="4">4.0 and above</option>
            <option value="4.5">4.5 and above</option>
            <option value="4.8">4.8 and above</option>
          </select>
        </label>

        <label>
          Availability
          <select
            className="input"
            value={draftFilters.availability}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                availability: event.target.value as TeacherFilters['availability'],
              }))
            }
          >
            <option value="any">Any availability</option>
            <option value="today">Available today</option>
            <option value="week">Available this week</option>
          </select>
        </label>

        <label>
          Sort by
          <select
            className="input"
            value={draftFilters.sort}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                sort: event.target.value as TeacherFilters['sort'],
              }))
            }
          >
            <option value="recommended">Recommended</option>
            <option value="rating">Highest rated</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="experience">Most experienced</option>
          </select>
        </label>

        <div className="teacher-filter-actions">
          <Button type="submit">
            <Filter size={17} /> Apply filters
          </Button>
          <Button
            className="button-secondary"
            type="button"
            onClick={clearFilters}
          >
            <RefreshCw size={17} /> Clear
          </Button>
        </div>
      </form>

      {teachersQuery.isLoading && (
        <div className="teacher-card-grid" aria-label="Loading teachers">
          {[1, 2, 3, 4].map((item) => (
            <div className="skeleton teacher-card-skeleton" key={item} />
          ))}
        </div>
      )}

      {teachersQuery.isError && (
        <Card className="teacher-discovery-error">
          <UserRoundSearch size={45} />
          <div>
            <h2>We couldn’t load teachers</h2>
            <p className="muted">
              Check that the API and MongoDB are running, then try again.
            </p>
          </div>
          <Button type="button" onClick={() => teachersQuery.refetch()}>
            <RefreshCw size={17} /> Try again
          </Button>
        </Card>
      )}

      {data && data.items.length === 0 && (
        <Card className="teacher-discovery-empty">
          <UserRoundSearch size={52} />
          <h2>No teachers found</h2>
          <p className="muted">
            {hasAppliedFilters
              ? 'Try widening the price, rating, subject, or availability filters.'
              : 'Approved teachers will appear here once profiles and availability are added.'}
          </p>
          {hasAppliedFilters && (
            <Button type="button" onClick={clearFilters}>
              Clear all filters
            </Button>
          )}
        </Card>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="teacher-results-heading">
            <div>
              <h2>Teachers for you</h2>
              <p className="muted">
                {data.pagination.total} verified teacher
                {data.pagination.total === 1 ? '' : 's'} found
              </p>
            </div>
            <span>
              <Award size={18} /> Sorted by {filters.sort.replace('_', ' ')}
            </span>
          </div>

          <div className="teacher-card-grid">
            {data.items.map((teacher) => (
              <TeacherCard key={teacher.id} teacher={teacher} />
            ))}
          </div>

          <div className="teacher-pagination">
            <Button
              className="button-secondary"
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft size={17} /> Previous
            </Button>
            <span>
              Page <strong>{data.pagination.page}</strong> of{' '}
              <strong>{data.pagination.totalPages}</strong>
            </span>
            <Button
              className="button-secondary"
              type="button"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next <ChevronRight size={17} />
            </Button>
          </div>
        </>
      )}

      <Card className="teacher-guidance-card">
        <span>
          <GraduationCap size={24} />
        </span>
        <div>
          <h3>Choosing a teacher</h3>
          <p className="muted">
            Compare subject expertise, experience, reviews, price, and the next
            available slot. Open a profile before booking to review full details.
          </p>
        </div>
      </Card>
    </div>
  )
}
