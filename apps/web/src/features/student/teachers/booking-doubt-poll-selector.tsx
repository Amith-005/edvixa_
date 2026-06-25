import '../../doubts/doubt-polls-layout.css'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  CircleAlert,
  MessageSquareText,
  Plus,
  Sparkles,
  ThumbsUp,
  UsersRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../../../lib/api'
import type { DoubtPoll, StudentDoubtPollsResponse } from '../../doubts/types'

function apiMessage(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? fallback
  )
}

type Props = {
  subjectId: string
  topicId?: string
  topicName: string
  selectedPollId: string
  onSelectedPollIdChange: (value: string) => void
}

export function BookingDoubtPollSelector({
  subjectId,
  topicId,
  topicName,
  selectedPollId,
  onSelectedPollIdChange,
}: Props) {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['booking-doubt-polls', subjectId, topicId, topicName],
    enabled: Boolean(subjectId && topicName),
    retry: false,
    queryFn: () =>
      api
        .get<{ data: StudentDoubtPollsResponse }>('/doubt-polls/student', {
          params: {
            subjectId,
            ...(topicId ? { topicId } : { topicName }),
            status: 'active',
            sort: 'popular',
            page: 1,
            limit: 6,
          },
        })
        .then((response) => response.data.data),
  })

  useEffect(() => {
    if (
      selectedPollId &&
      query.data &&
      !query.data.items.some((poll) => poll.id === selectedPollId && poll.joined)
    ) {
      onSelectedPollIdChange('')
    }
  }, [onSelectedPollIdChange, query.data, selectedPollId])

  const voteMutation = useMutation({
    mutationFn: (poll: DoubtPoll) =>
      api
        .post<{ data: { joined: boolean } }>(
          `/doubt-polls/student/${poll.id}/vote`,
        )
        .then((response) => ({ poll, ...response.data.data })),
    onSuccess: async ({ poll, joined }) => {
      if (joined) onSelectedPollIdChange(poll.id)
      else if (selectedPollId === poll.id) onSelectedPollIdChange('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking-doubt-polls'] }),
        queryClient.invalidateQueries({ queryKey: ['student-doubt-polls'] }),
      ])
    },
  })

  const createMutation = useMutation({
    mutationFn: () =>
      api
        .post<{ data: DoubtPoll }>('/doubt-polls/student', {
          subjectId,
          ...(topicId ? { topicId } : {}),
          topicName,
          title: title.trim(),
          description: description.trim(),
        })
        .then((response) => response.data.data),
    onSuccess: async (poll) => {
      onSelectedPollIdChange(poll.id)
      setTitle('')
      setDescription('')
      setShowCreate(false)
      setError('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking-doubt-polls'] }),
        queryClient.invalidateQueries({ queryKey: ['student-doubt-polls'] }),
      ])
    },
    onError: (mutationError) => {
      setError(apiMessage(mutationError, 'The doubt poll could not be created.'))
    },
  })

  const gradeRequired =
    query.isError &&
    (query.error as { response?: { data?: { error?: { code?: string } } } })
      ?.response?.data?.error?.code === 'GRADE_REQUIRED'

  return (
    <div className="booking-doubt-selector">
      <div className="booking-doubt-heading">
        <div>
          <span>Doubt poll <strong>Required</strong></span>
          <small>
            Students in your standard can join the same doubt. The teacher sees the total before class.
          </small>
        </div>
        {query.data && <em>{query.data.gradeLevel}</em>}
      </div>

      {gradeRequired ? (
        <div className="booking-doubt-grade-warning">
          <CircleAlert size={18} />
          <div>
            <strong>Add your standard to continue</strong>
            <p>Doubt polls are visible only inside the same standard.</p>
          </div>
          <Link to="/student/profile">Update profile</Link>
        </div>
      ) : query.isLoading ? (
        <p className="teacher-profile-topic-help">Finding popular doubts in this chapter…</p>
      ) : query.isError ? (
        <div className="doubt-inline-error">
          <CircleAlert size={17} />
          {apiMessage(query.error, 'Could not load chapter doubts.')}
        </div>
      ) : (
        <>
          {(query.data?.items ?? []).length ? (
            <div className="booking-doubt-options">
              {query.data?.items.map((poll) => {
                const selected = selectedPollId === poll.id
                return (
                  <article
                    key={poll.id}
                    className={selected ? 'booking-doubt-option selected' : 'booking-doubt-option'}
                  >
                    <button
                      type="button"
                      className="booking-doubt-main"
                      disabled={!poll.joined}
                      onClick={() => onSelectedPollIdChange(poll.id)}
                    >
                      <span className="booking-doubt-radio" aria-hidden="true">
                        {selected && <CheckCircle2 size={17} />}
                      </span>
                      <span>
                        <strong>{poll.title}</strong>
                        {poll.description && <small>{poll.description}</small>}
                      </span>
                    </button>
                    <div className="booking-doubt-stats">
                      <span><UsersRound size={14} /> {poll.voteCount}</span>
                      <span><MessageSquareText size={14} /> {poll.commentCount}</span>
                      {poll.assignedTeacher && <span><Sparkles size={14} /> Preparing</span>}
                    </div>
                    {poll.joined ? (
                      <button
                        type="button"
                        className="booking-doubt-joined"
                        onClick={() => onSelectedPollIdChange(poll.id)}
                      >
                        <ThumbsUp size={15} /> Joined · Select
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="booking-doubt-join"
                        disabled={voteMutation.isPending}
                        onClick={() => voteMutation.mutate(poll)}
                      >
                        <ThumbsUp size={15} /> I have this doubt too
                      </button>
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="booking-doubt-empty">
              <MessageSquareText size={25} />
              <div>
                <strong>No open poll for this chapter</strong>
                <p>Create the first one so classmates can join it.</p>
              </div>
            </div>
          )}

          <button
            type="button"
            className="booking-doubt-create-toggle"
            onClick={() => setShowCreate((value) => !value)}
          >
            <Plus size={16} /> {showCreate ? 'Hide new poll form' : 'Create a different doubt poll'}
          </button>

          {showCreate && (
            <div className="booking-doubt-create-form">
              <label>
                Exact doubt
                <input
                  value={title}
                  maxLength={160}
                  placeholder={`What is confusing in ${topicName}?`}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label>
                More detail <span>(optional)</span>
                <textarea
                  rows={3}
                  maxLength={1200}
                  value={description}
                  placeholder="Mention the formula, exercise or step you want explained."
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              {error && <div className="doubt-inline-error"><CircleAlert size={17} />{error}</div>}
              <button
                type="button"
                className="button"
                disabled={title.trim().length < 5 || createMutation.isPending}
                onClick={() => { setError(''); createMutation.mutate() }}
              >
                <Plus size={16} /> {createMutation.isPending ? 'Creating…' : 'Create and join poll'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
