import '../../doubts/doubt-polls-layout.css'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Filter,
  Flame,
  GraduationCap,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  ThumbsUp,
  UsersRound,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Card } from '../../../components/ui'
import { api } from '../../../lib/api'
import type {
  DoubtPoll,
  DoubtSubject,
  StudentDoubtPollsResponse,
} from '../../doubts/types'
import { DoubtComments } from './doubt-comments'

function apiMessage(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? fallback
  )
}

function statusLabel(status: DoubtPoll['status']) {
  if (status === 'will_cover') return 'Teacher will cover'
  if (status === 'resolved') return 'Resolved'
  if (status === 'closed') return 'Closed'
  return 'Open'
}

function PollCard({ poll }: { poll: DoubtPoll }) {
  const queryClient = useQueryClient()
  const [showComments, setShowComments] = useState(false)
  const voteMutation = useMutation({
    mutationFn: () =>
      api
        .post<{ data: { joined: boolean; voteCount: number } }>(
          `/doubt-polls/student/${poll.id}/vote`,
        )
        .then((response) => response.data.data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['student-doubt-polls'] }),
        queryClient.invalidateQueries({ queryKey: ['doubt-poll-detail', poll.id] }),
      ])
    },
  })

  return (
    <Card className="doubt-poll-card">
      <div className="doubt-poll-card-top">
        <div className="doubt-poll-tags">
          <span>{poll.gradeLevel}</span>
          <span>{poll.subject.name}</span>
          <span>{poll.topic.name}</span>
        </div>
        <span className={`doubt-status doubt-status-${poll.status}`}>
          {poll.status === 'will_cover' && <Sparkles size={13} />}
          {poll.status === 'resolved' && <CheckCircle2 size={13} />}
          {statusLabel(poll.status)}
        </span>
      </div>

      <h2>{poll.title}</h2>
      {poll.description && <p className="doubt-poll-description">{poll.description}</p>}

      {poll.assignedTeacher && (
        <div className="doubt-teacher-plan">
          <Sparkles size={17} />
          <div>
            <strong>{poll.assignedTeacher.name} is preparing this doubt</strong>
            {poll.preparationNote && <p>{poll.preparationNote}</p>}
          </div>
        </div>
      )}

      <div className="doubt-poll-meta">
        <span>
          <UsersRound size={16} /> {poll.voteCount} student{poll.voteCount === 1 ? '' : 's'}
        </span>
        <span>
          <MessageCircle size={16} /> {poll.commentCount} comment{poll.commentCount === 1 ? '' : 's'}
        </span>
        <span>
          {new Date(poll.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
          })}
        </span>
      </div>

      <div className="doubt-poll-actions">
        <button
          type="button"
          className={poll.joined ? 'button doubt-vote joined' : 'button doubt-vote'}
          disabled={voteMutation.isPending || poll.status === 'closed'}
          onClick={() => voteMutation.mutate()}
        >
          <ThumbsUp size={17} />
          {poll.isCreator
            ? 'Your poll'
            : poll.joined
              ? 'I have this doubt too'
              : 'Join this doubt'}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => setShowComments((value) => !value)}
        >
          <MessageCircle size={17} />
          {showComments ? 'Hide discussion' : 'View discussion'}
          <ChevronDown size={15} className={showComments ? 'rotated' : ''} />
        </button>
      </div>

      {showComments && <DoubtComments pollId={poll.id} />}
    </Card>
  )
}

export function StudentDoubtPollsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState<'popular' | 'latest' | 'unanswered'>('popular')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [createSubjectId, setCreateSubjectId] = useState('')
  const [createTopicId, setCreateTopicId] = useState('')
  const [createTitle, setCreateTitle] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createError, setCreateError] = useState('')

  const subjectsQuery = useQuery({
    queryKey: ['subjects', 'doubt-polls'],
    queryFn: () =>
      api
        .get<{ data: DoubtSubject[] }>('/subjects')
        .then((response) => response.data.data),
    staleTime: 5 * 60 * 1000,
  })

  const pollsQuery = useQuery({
    queryKey: [
      'student-doubt-polls',
      { search, subjectId, topicId, status, sort, page },
    ],
    retry: false,
    queryFn: () =>
      api
        .get<{ data: StudentDoubtPollsResponse }>('/doubt-polls/student', {
          params: {
            ...(search.trim() ? { search: search.trim() } : {}),
            ...(subjectId ? { subjectId } : {}),
            ...(topicId ? { topicId } : {}),
            ...(status ? { status } : {}),
            sort,
            page,
            limit: 12,
          },
        })
        .then((response) => response.data.data),
  })

  const selectedFilterSubject = useMemo(
    () => subjectsQuery.data?.find((subject) => subject._id === subjectId),
    [subjectId, subjectsQuery.data],
  )
  const filterTopics = (selectedFilterSubject?.topics ?? []).filter(
    (topic) => topic.isActive !== false,
  )

  const selectedCreateSubject = useMemo(
    () => subjectsQuery.data?.find((subject) => subject._id === createSubjectId),
    [createSubjectId, subjectsQuery.data],
  )
  const createTopics = (selectedCreateSubject?.topics ?? []).filter(
    (topic) => topic.isActive !== false,
  )
  const selectedCreateTopic = createTopics.find((topic) => topic._id === createTopicId)

  const createMutation = useMutation({
    mutationFn: () =>
      api
        .post<{ data: DoubtPoll }>('/doubt-polls/student', {
          subjectId: createSubjectId,
          ...(createTopicId ? { topicId: createTopicId } : {}),
          topicName: selectedCreateTopic?.name ?? '',
          title: createTitle.trim(),
          description: createDescription.trim(),
        })
        .then((response) => response.data.data),
    onSuccess: async () => {
      setCreateTitle('')
      setCreateDescription('')
      setCreateTopicId('')
      setShowCreate(false)
      setCreateError('')
      await queryClient.invalidateQueries({ queryKey: ['student-doubt-polls'] })
    },
    onError: (error) => {
      setCreateError(apiMessage(error, 'The doubt poll could not be created.'))
    },
  })

  const gradeError =
    pollsQuery.isError &&
    (pollsQuery.error as { response?: { data?: { error?: { code?: string } } } })
      ?.response?.data?.error?.code === 'GRADE_REQUIRED'

  return (
    <div className="student-doubts-page">
      <header className="doubt-page-header">
        <div>
          <p className="muted">Student community · Same-standard visibility</p>
          <h1>Doubt Polls</h1>
          <p className="muted">
            Find classmates with the same chapter doubt and help teachers prepare the most-needed lessons.
          </p>
        </div>
        <button
          type="button"
          className="button"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={18} /> Create doubt poll
        </button>
      </header>

      {pollsQuery.data && (
        <section className="doubt-summary-grid">
          <Card>
            <BookOpen size={20} />
            <div><span>Your standard</span><strong>{pollsQuery.data.gradeLevel}</strong></div>
          </Card>
          <Card>
            <UsersRound size={20} />
            <div><span>Visible polls</span><strong>{pollsQuery.data.summary.totalPolls}</strong></div>
          </Card>
          <Card>
            <Flame size={20} />
            <div><span>Open doubts</span><strong>{pollsQuery.data.summary.openPolls}</strong></div>
          </Card>
          <Card>
            <ThumbsUp size={20} />
            <div><span>You joined</span><strong>{pollsQuery.data.summary.joinedPolls}</strong></div>
          </Card>
        </section>
      )}

      <Card className="doubt-filter-card">
        <div className="doubt-search-field">
          <Search size={18} />
          <input
            value={search}
            placeholder="Search doubts, chapters or subjects"
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <label>
          Subject
          <select
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value)
              setTopicId('')
              setPage(1)
            }}
          >
            <option value="">All subjects</option>
            {(subjectsQuery.data ?? []).map((subject) => (
              <option key={subject._id} value={subject._id}>{subject.name}</option>
            ))}
          </select>
        </label>
        <label>
          Chapter
          <select
            value={topicId}
            disabled={!subjectId}
            onChange={(event) => {
              setTopicId(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All chapters</option>
            {filterTopics.map((topic) => (
              <option key={topic._id} value={topic._id}>{topic.name}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
            <option value="">Any status</option>
            <option value="open">Open</option>
            <option value="will_cover">Teacher will cover</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        <label>
          Sort
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as typeof sort)
              setPage(1)
            }}
          >
            <option value="popular">Most voted</option>
            <option value="latest">Latest</option>
            <option value="unanswered">Unanswered</option>
          </select>
        </label>
      </Card>

      {gradeError ? (
        <Card className="doubt-grade-required">
          <GraduationCap size={38} />
          <h2>Add your standard first</h2>
          <p>
            Doubt polls are private to students in the same standard. Add your grade or class in Profile to continue.
          </p>
          <Link className="button" to="/student/profile">Update profile</Link>
        </Card>
      ) : pollsQuery.isLoading ? (
        <div className="doubt-loading-grid">
          {[1, 2, 3].map((value) => <div key={value} className="skeleton doubt-loading-card" />)}
        </div>
      ) : pollsQuery.isError ? (
        <Card className="doubt-error-card">
          <CircleAlert size={35} />
          <h2>Could not load doubt polls</h2>
          <p>{apiMessage(pollsQuery.error, 'Please try again.')}</p>
          <button type="button" className="button" onClick={() => pollsQuery.refetch()}>Try again</button>
        </Card>
      ) : pollsQuery.data?.items.length ? (
        <>
          <div className="doubt-poll-list">
            {pollsQuery.data.items.map((poll) => <PollCard key={poll.id} poll={poll} />)}
          </div>
          <div className="doubt-pagination">
            <button
              type="button"
              className="button button-secondary"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft size={17} /> Previous
            </button>
            <span>Page {pollsQuery.data.pagination.page} of {pollsQuery.data.pagination.totalPages}</span>
            <button
              type="button"
              className="button button-secondary"
              disabled={page >= pollsQuery.data.pagination.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next <ChevronRight size={17} />
            </button>
          </div>
        </>
      ) : (
        <Card className="doubt-empty-card">
          <Filter size={36} />
          <h2>No matching doubt polls</h2>
          <p>Start the first poll for this chapter so classmates can join it.</p>
          <button type="button" className="button" onClick={() => setShowCreate(true)}>
            <Plus size={17} /> Create poll
          </button>
        </Card>
      )}

      {showCreate && (
        <div className="doubt-modal-backdrop" role="presentation">
          <section className="card doubt-create-modal" role="dialog" aria-modal="true">
            <div className="doubt-modal-header">
              <div>
                <p className="muted">Visible only to your standard</p>
                <h2>Create a doubt poll</h2>
              </div>
              <button type="button" aria-label="Close" onClick={() => setShowCreate(false)}>
                <X size={20} />
              </button>
            </div>

            <label>
              Subject
              <select
                value={createSubjectId}
                onChange={(event) => {
                  setCreateSubjectId(event.target.value)
                  setCreateTopicId('')
                }}
              >
                <option value="">Select subject</option>
                {(subjectsQuery.data ?? []).map((subject) => (
                  <option key={subject._id} value={subject._id}>{subject.name}</option>
                ))}
              </select>
            </label>

            <label>
              Chapter
              <select
                value={createTopicId}
                disabled={!createSubjectId}
                onChange={(event) => setCreateTopicId(event.target.value)}
              >
                <option value="">Select chapter</option>
                {createTopics.map((topic) => (
                  <option key={topic._id} value={topic._id}>{topic.name}</option>
                ))}
              </select>
            </label>

            <label>
              Your doubt
              <input
                value={createTitle}
                maxLength={160}
                placeholder="Example: Why is momentum conserved during a collision?"
                onChange={(event) => setCreateTitle(event.target.value)}
              />
            </label>

            <label>
              More details <span>(optional)</span>
              <textarea
                value={createDescription}
                maxLength={1200}
                rows={4}
                placeholder="Mention the formula, exercise number or exact step that is confusing."
                onChange={(event) => setCreateDescription(event.target.value)}
              />
            </label>

            {createError && <div className="doubt-inline-error"><CircleAlert size={17} />{createError}</div>}

            <div className="doubt-modal-actions">
              <button type="button" className="button button-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                type="button"
                className="button"
                disabled={!createSubjectId || !createTopicId || createTitle.trim().length < 5 || createMutation.isPending}
                onClick={() => { setCreateError(''); createMutation.mutate() }}
              >
                <Plus size={17} /> {createMutation.isPending ? 'Creating…' : 'Create poll'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
