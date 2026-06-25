import '../../doubts/doubt-polls-layout.css'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Filter,
  MessageSquareText,
  Search,
  Sparkles,
  ThumbsUp,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'

import { Card } from '../../../components/ui'
import { api } from '../../../lib/api'
import type {
  DoubtPoll,
  DoubtPollStatus,
  TeacherDoubtPollsResponse,
} from '../../doubts/types'

function apiMessage(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? fallback
  )
}

function TeacherPollCard({ poll }: { poll: DoubtPoll }) {
  const queryClient = useQueryClient()
  const [note, setNote] = useState(poll.preparationNote)
  const [message, setMessage] = useState('')

  const updateMutation = useMutation({
    mutationFn: (status: 'open' | 'will_cover' | 'resolved') =>
      api
        .patch<{ data: DoubtPoll }>(
          `/doubt-polls/teacher/${poll.id}/preparation`,
          { status, preparationNote: note.trim() },
        )
        .then((response) => response.data.data),
    onSuccess: async () => {
      setMessage('Saved')
      await queryClient.invalidateQueries({ queryKey: ['teacher-doubt-polls'] })
      window.setTimeout(() => setMessage(''), 1800)
    },
  })

  return (
    <Card className="teacher-doubt-card">
      <div className="teacher-doubt-card-top">
        <div className="doubt-poll-tags">
          <span>{poll.gradeLevel}</span>
          <span>{poll.subject.name}</span>
          <span>{poll.topic.name}</span>
        </div>
        <span className={`doubt-status doubt-status-${poll.status}`}>
          {poll.status === 'will_cover' && <Sparkles size={13} />}
          {poll.status === 'resolved' && <CheckCircle2 size={13} />}
          {poll.status === 'will_cover'
            ? 'Will cover'
            : poll.status.charAt(0).toUpperCase() + poll.status.slice(1)}
        </span>
      </div>

      <h2>{poll.title}</h2>
      {poll.description && <p className="doubt-poll-description">{poll.description}</p>}

      <div className="teacher-doubt-impact">
        <div><ThumbsUp size={18} /><strong>{poll.voteCount}</strong><span>students need this</span></div>
        <div><MessageSquareText size={18} /><strong>{poll.commentCount}</strong><span>discussion notes</span></div>
        <div><Clock3 size={18} /><strong>{poll.linkedBookingCount}</strong><span>linked bookings</span></div>
      </div>

      <label className="teacher-preparation-note">
        Preparation note
        <textarea
          rows={3}
          maxLength={1200}
          value={note}
          placeholder="Example: Prepare collision examples and two conservation-of-momentum numericals."
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      <div className="teacher-doubt-actions">
        <button
          type="button"
          className="button button-secondary"
          disabled={updateMutation.isPending}
          onClick={() => updateMutation.mutate('open')}
        >
          Keep open
        </button>
        <button
          type="button"
          className="button"
          disabled={updateMutation.isPending}
          onClick={() => updateMutation.mutate('will_cover')}
        >
          <Sparkles size={17} /> Will cover
        </button>
        <button
          type="button"
          className="button teacher-resolve-button"
          disabled={updateMutation.isPending}
          onClick={() => updateMutation.mutate('resolved')}
        >
          <CheckCircle2 size={17} /> Resolve
        </button>
      </div>

      {message && <p className="teacher-doubt-saved">{message}</p>}
      {updateMutation.isError && (
        <div className="doubt-inline-error">
          <CircleAlert size={17} />
          {apiMessage(updateMutation.error, 'Could not update this doubt.')}
        </div>
      )}
    </Card>
  )
}

export function TeacherDoubtPollsPage() {
  const [search, setSearch] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [status, setStatus] = useState<'' | DoubtPollStatus>('')
  const [sort, setSort] = useState<'popular' | 'latest'>('popular')
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: [
      'teacher-doubt-polls',
      { search, gradeLevel, subjectId, status, sort, page },
    ],
    queryFn: () =>
      api
        .get<{ data: TeacherDoubtPollsResponse }>('/doubt-polls/teacher', {
          params: {
            ...(search.trim() ? { search: search.trim() } : {}),
            ...(gradeLevel ? { gradeLevel } : {}),
            ...(subjectId ? { subjectId } : {}),
            ...(status ? { status } : {}),
            sort,
            page,
            limit: 12,
          },
        })
        .then((response) => response.data.data),
  })

  return (
    <div className="teacher-doubts-page">
      <header className="doubt-page-header">
        <div>
          <p className="muted">Teacher preparation · Ranked student demand</p>
          <h1>Student Doubts</h1>
          <p className="muted">
            See what students in each standard need, prioritise popular chapters and prepare before lessons.
          </p>
        </div>
      </header>

      {query.data && (
        <section className="doubt-summary-grid">
          <Card><BookOpen size={20} /><div><span>Total doubts</span><strong>{query.data.summary.totalPolls}</strong></div></Card>
          <Card><UsersRound size={20} /><div><span>Students waiting</span><strong>{query.data.summary.studentsWaiting}</strong></div></Card>
          <Card><MessageSquareText size={20} /><div><span>Open</span><strong>{query.data.summary.openPolls}</strong></div></Card>
          <Card><Sparkles size={20} /><div><span>Will cover</span><strong>{query.data.summary.willCoverPolls}</strong></div></Card>
        </section>
      )}

      <Card className="doubt-filter-card teacher-doubt-filters">
        <div className="doubt-search-field">
          <Search size={18} />
          <input
            value={search}
            placeholder="Search student doubts or chapters"
            onChange={(event) => { setSearch(event.target.value); setPage(1) }}
          />
        </div>
        <label>
          Standard
          <select value={gradeLevel} onChange={(event) => { setGradeLevel(event.target.value); setPage(1) }}>
            <option value="">All standards</option>
            {(query.data?.filters.gradeLevels ?? []).map((grade) => <option key={grade}>{grade}</option>)}
          </select>
        </label>
        <label>
          Subject
          <select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setPage(1) }}>
            <option value="">My subjects</option>
            {(query.data?.filters.subjects ?? []).map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1) }}>
            <option value="">Any status</option>
            <option value="open">Open</option>
            <option value="will_cover">Will cover</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        <label>
          Sort
          <select value={sort} onChange={(event) => { setSort(event.target.value as typeof sort); setPage(1) }}>
            <option value="popular">Most students</option>
            <option value="latest">Latest</option>
          </select>
        </label>
      </Card>

      {query.isLoading ? (
        <div className="doubt-loading-grid">{[1, 2, 3].map((value) => <div key={value} className="skeleton doubt-loading-card" />)}</div>
      ) : query.isError ? (
        <Card className="doubt-error-card">
          <CircleAlert size={35} />
          <h2>Could not load student doubts</h2>
          <p>{apiMessage(query.error, 'Please try again.')}</p>
          <button type="button" className="button" onClick={() => query.refetch()}>Try again</button>
        </Card>
      ) : query.data?.items.length ? (
        <>
          <div className="teacher-doubt-list">
            {query.data.items.map((poll) => <TeacherPollCard key={poll.id} poll={poll} />)}
          </div>
          <div className="doubt-pagination">
            <button type="button" className="button button-secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              <ChevronLeft size={17} /> Previous
            </button>
            <span>Page {query.data.pagination.page} of {query.data.pagination.totalPages}</span>
            <button type="button" className="button button-secondary" disabled={page >= query.data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>
              Next <ChevronRight size={17} />
            </button>
          </div>
        </>
      ) : (
        <Card className="doubt-empty-card">
          <Filter size={36} />
          <h2>No matching student doubts</h2>
          <p>New polls from students in your teaching subjects will appear here.</p>
        </Card>
      )}
    </div>
  )
}
