import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Clock3,
  Eraser,
  Flag,
  LoaderCircle,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Badge, Button, Card } from '../../../components/ui'
import { api } from '../../../lib/api'
import type {
  ActivePracticeAnswer,
  ActivePracticeSession,
  SubmitPracticeResponse,
} from './types'

async function getPracticeSession(id: string): Promise<ActivePracticeSession> {
  const response = await api.get<{
    success: true
    data: ActivePracticeSession
  }>(`/practice/sessions/${id}`)

  return response.data.data
}

export function ActivePracticePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showSubmit, setShowSubmit] = useState(false)
  const [error, setError] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const questionStartedAt = useRef(Date.now())

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['practice-session', id],
    queryFn: () => getPracticeSession(id),
    enabled: Boolean(id),
  })

  useEffect(() => {
    if (!data?.startedAt) return

    const update = () => {
      setElapsedSeconds(
        Math.max(
          0,
          Math.floor((Date.now() - new Date(data.startedAt!).getTime()) / 1000),
        ),
      )
    }

    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [data?.startedAt])

  useEffect(() => {
    questionStartedAt.current = Date.now()
  }, [currentIndex])

  const answersByQuestion = useMemo(() => {
    return new Map(
      (data?.answers ?? []).map((answer) => [answer.questionId, answer]),
    )
  }, [data?.answers])

  const currentQuestion = data?.questions[currentIndex]
  const currentAnswer = currentQuestion
    ? answersByQuestion.get(currentQuestion.id)
    : undefined

  const saveAnswer = useMutation({
    mutationFn: async ({
      questionId,
      selectedAnswer,
      markedForReview,
    }: {
      questionId: string
      selectedAnswer: string | null
      markedForReview?: boolean
    }) => {
      const secondsOnQuestion = Math.max(
        0,
        Math.floor((Date.now() - questionStartedAt.current) / 1000),
      )
      const response = await api.patch<{
        success: true
        data: ActivePracticeAnswer
      }>(`/practice/sessions/${id}/answers`, {
        questionId,
        selectedAnswer,
        markedForReview,
        timeTakenSeconds:
          (answersByQuestion.get(questionId)?.timeTakenSeconds ?? 0) +
          secondsOnQuestion,
      })
      return response.data.data
    },
    onMutate: async (variables) => {
      setError('')
      await queryClient.cancelQueries({ queryKey: ['practice-session', id] })
      const previous = queryClient.getQueryData<ActivePracticeSession>([
        'practice-session',
        id,
      ])

      queryClient.setQueryData<ActivePracticeSession>(
        ['practice-session', id],
        (current) => {
          if (!current) return current
          return {
            ...current,
            answers: current.answers.map((answer) =>
              answer.questionId === variables.questionId
                ? {
                    ...answer,
                    selectedAnswer: variables.selectedAnswer,
                    markedForReview:
                      variables.markedForReview ?? answer.markedForReview,
                  }
                : answer,
            ),
          }
        },
      )

      return { previous }
    },
    onError: (requestError, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ['practice-session', id],
          context.previous,
        )
      }
      setError(
        axios.isAxiosError(requestError)
          ? requestError.response?.data?.error?.message ??
              'Your answer could not be saved.'
          : 'Your answer could not be saved.',
      )
    },
    onSuccess: (saved) => {
      questionStartedAt.current = Date.now()
      queryClient.setQueryData<ActivePracticeSession>(
        ['practice-session', id],
        (current) => {
          if (!current) return current
          return {
            ...current,
            answers: current.answers.map((answer) =>
              answer.questionId === saved.questionId ? saved : answer,
            ),
          }
        },
      )
    },
  })

  const submitSession = useMutation({
    mutationFn: async () => {
      const response = await api.post<{
        success: true
        data: SubmitPracticeResponse
      }>(`/practice/sessions/${id}/submit`, {
        timeTakenSeconds: elapsedSeconds,
      })
      return response.data.data
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] })
      navigate(`/student/results/${result.id}`)
    },
    onError: (requestError) => {
      setShowSubmit(false)
      setError(
        axios.isAxiosError(requestError)
          ? requestError.response?.data?.error?.message ??
              'The practice session could not be submitted.'
          : 'The practice session could not be submitted.',
      )
    },
  })

  if (isLoading) return <ActivePracticeSkeleton />

  if (isError || !data || !currentQuestion) {
    return (
      <Card>
        <div className="practice-active-error">
          <Sparkles size={34} />
          <div>
            <h3>Practice session could not be loaded</h3>
            <p className="muted">
              The session may not exist or the API may be unavailable.
            </p>
          </div>
          <Button type="button" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </Card>
    )
  }

  const answeredCount = data.answers.filter(
    (answer) => answer.selectedAnswer !== null,
  ).length
  const markedCount = data.answers.filter(
    (answer) => answer.markedForReview,
  ).length
  const completionPercent = Math.round(
    ((currentIndex + 1) / data.questions.length) * 100,
  )

  const chooseAnswer = (selectedAnswer: string) => {
    saveAnswer.mutate({
      questionId: currentQuestion.id,
      selectedAnswer,
    })
  }

  const clearAnswer = () => {
    saveAnswer.mutate({
      questionId: currentQuestion.id,
      selectedAnswer: null,
    })
  }

  const toggleReview = () => {
    saveAnswer.mutate({
      questionId: currentQuestion.id,
      selectedAnswer: currentAnswer?.selectedAnswer ?? null,
      markedForReview: !currentAnswer?.markedForReview,
    })
  }

  return (
    <div className="active-practice-page">
      <header className="active-practice-header">
        <div>
          <p className="muted">Student · AI Practice · Active session</p>
          <div className="active-practice-title-row">
            <h1>{data.subject.name} Practice</h1>
            <Badge tone="purple">{currentQuestion.topicName}</Badge>
            <Badge tone="neutral">Level {currentQuestion.difficulty}</Badge>
          </div>
        </div>
        <div className="active-practice-timer">
          <Clock3 size={18} />
          <strong>{formatTime(elapsedSeconds)}</strong>
        </div>
      </header>

      <div className="active-practice-progress-row">
        <span>
          Question {currentIndex + 1} of {data.questions.length}
        </span>
        <div className="active-practice-progress">
          <span style={{ width: `${completionPercent}%` }} />
        </div>
        <span>{completionPercent}%</span>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="active-practice-layout">
        <div className="active-practice-main">
          <Card className="active-question-card">
            <div className="active-question-meta">
              <Badge tone="purple">AI-generated question</Badge>
              <span>{currentQuestion.points} XP points</span>
            </div>

            <h2>{currentQuestion.text}</h2>
            <p className="muted">Select the best answer.</p>

            <div className="active-option-list">
              {currentQuestion.options.map((option, index) => {
                const selected = currentAnswer?.selectedAnswer === option
                return (
                  <button
                    className={
                      selected
                        ? 'active-option selected'
                        : 'active-option'
                    }
                    key={option}
                    type="button"
                    onClick={() => chooseAnswer(option)}
                  >
                    <span className="active-option-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                    {selected && <CheckCircle2 size={19} />}
                  </button>
                )
              })}
            </div>
          </Card>

          <Card className="active-practice-hint">
            <Sparkles size={19} />
            <span>
              Need help? Review the topic notes before submitting your final
              answer.
            </span>
          </Card>

          <div className="active-practice-actions">
            <Button
              className="button-secondary"
              disabled={currentIndex === 0}
              type="button"
              onClick={() => setCurrentIndex((value) => value - 1)}
            >
              <ArrowLeft size={17} />
              Previous
            </Button>
            <Button
              className="button-secondary"
              disabled={currentAnswer?.selectedAnswer === null}
              type="button"
              onClick={clearAnswer}
            >
              <Eraser size={17} />
              Clear answer
            </Button>
            <Button
              className={
                currentAnswer?.markedForReview
                  ? 'button-review-active'
                  : 'button-secondary'
              }
              type="button"
              onClick={toggleReview}
            >
              <Flag size={17} />
              {currentAnswer?.markedForReview
                ? 'Marked for review'
                : 'Mark for review'}
            </Button>
            {currentIndex < data.questions.length - 1 ? (
              <Button
                type="button"
                onClick={() => setCurrentIndex((value) => value + 1)}
              >
                Next question
                <ArrowRight size={17} />
              </Button>
            ) : (
              <Button type="button" onClick={() => setShowSubmit(true)}>
                Submit practice
                <Send size={17} />
              </Button>
            )}
          </div>
        </div>

        <aside className="active-practice-sidebar">
          <Card>
            <div className="row-between">
              <h3>Question navigator</h3>
              <span>{answeredCount}/{data.questions.length}</span>
            </div>
            <div className="active-question-grid">
              {data.questions.map((question, index) => {
                const answer = answersByQuestion.get(question.id)
                const className = [
                  'active-question-number',
                  index === currentIndex ? 'current' : '',
                  answer?.selectedAnswer !== null ? 'answered' : '',
                  answer?.markedForReview ? 'review' : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <button
                    aria-label={`Go to question ${index + 1}`}
                    className={className}
                    key={question.id}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>
            <div className="active-practice-legend">
              <span><i className="answered" />Answered</span>
              <span><i className="review" />Review</span>
              <span><i />Unanswered</span>
            </div>
          </Card>

          <Card>
            <p className="muted">Session summary</p>
            <div className="active-summary-list">
              <div><span>Answered</span><strong>{answeredCount}</strong></div>
              <div><span>Marked for review</span><strong>{markedCount}</strong></div>
              <div><span>Remaining</span><strong>{data.questions.length - answeredCount}</strong></div>
              <div><span>Estimated time</span><strong>{data.estimatedMinutes} min</strong></div>
            </div>
          </Card>

          <Button
            className="active-submit-side"
            type="button"
            onClick={() => setShowSubmit(true)}
          >
            Submit practice
            <Send size={17} />
          </Button>
        </aside>
      </div>

      {showSubmit && (
        <div className="active-practice-modal-backdrop" role="presentation">
          <div
            aria-labelledby="submit-practice-title"
            aria-modal="true"
            className="active-practice-modal"
            role="dialog"
          >
            <button
              aria-label="Close submit confirmation"
              className="active-modal-close"
              type="button"
              onClick={() => setShowSubmit(false)}
            >
              <X size={19} />
            </button>
            <div className="active-modal-icon"><Bookmark size={24} /></div>
            <h2 id="submit-practice-title">Submit this practice?</h2>
            <p className="muted">
              You answered {answeredCount} of {data.questions.length} questions.
              {data.questions.length - answeredCount > 0
                ? ` ${data.questions.length - answeredCount} unanswered questions will be skipped.`
                : ' All questions have an answer.'}
            </p>
            <div className="active-modal-actions">
              <Button
                className="button-secondary"
                type="button"
                onClick={() => setShowSubmit(false)}
              >
                Continue practice
              </Button>
              <Button
                disabled={submitSession.isPending}
                type="button"
                onClick={() => submitSession.mutate()}
              >
                {submitSession.isPending ? (
                  <><LoaderCircle className="spin" size={17} />Submitting...</>
                ) : (
                  <><Send size={17} />Submit now</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function ActivePracticeSkeleton() {
  return (
    <div className="active-practice-page">
      <div className="skeleton active-practice-header-skeleton" />
      <div className="active-practice-layout">
        <div className="skeleton active-practice-question-skeleton" />
        <div className="skeleton active-practice-side-skeleton" />
      </div>
    </div>
  )
}
