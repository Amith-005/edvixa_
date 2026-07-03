import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Flag,
  Gauge,
  Lightbulb,
  MinusCircle,
  RefreshCw,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Badge, Button, Card, StatCard } from '../../../components/ui'
import { api } from '../../../lib/api'
import type {
  PracticeReviewData,
  PracticeReviewQuestionStatus,
} from './types'

type ReviewFilter = 'all' | PracticeReviewQuestionStatus | 'marked'

async function getPracticeReview(id: string): Promise<PracticeReviewData> {
  const response = await api.get<{
    success: true
    data: PracticeReviewData
  }>(`/practice/sessions/${id}/review`)

  return response.data.data
}

export function AnswerReviewPage() {
  const { id = '' } = useParams()
  const [filter, setFilter] = useState<ReviewFilter>('all')

  const reviewQuery = useQuery({
    queryKey: ['practice-review', id],
    queryFn: () => getPracticeReview(id),
    enabled: Boolean(id),
  })

  const data = reviewQuery.data
  const filteredQuestions = useMemo(() => {
    if (!data) return []
    if (filter === 'all') return data.questions
    if (filter === 'marked') {
      return data.questions.filter((question) => question.markedForReview)
    }
    return data.questions.filter((question) => question.status === filter)
  }, [data, filter])

  if (reviewQuery.isLoading) {
    return <AnswerReviewSkeleton />
  }

  if (reviewQuery.isError || !data) {
    return (
      <Card>
        <div className="answer-review-error">
          <BrainCircuit size={40} />
          <div>
            <h3>We could not load this answer review</h3>
            <p className="muted">
              Confirm the API is running and that this practice belongs to your
              account.
            </p>
          </div>
          <Button type="button" onClick={() => reviewQuery.refetch()}>
            <RefreshCw size={17} />
            Try again
          </Button>
        </div>
      </Card>
    )
  }

  const filters: Array<{
    key: ReviewFilter
    label: string
    count: number
  }> = [
    { key: 'all', label: 'All', count: data.summary.totalQuestions },
    { key: 'correct', label: 'Correct', count: data.summary.correctAnswers },
    { key: 'wrong', label: 'Wrong', count: data.summary.wrongAnswers },
    { key: 'skipped', label: 'Skipped', count: data.summary.skipped },
    { key: 'marked', label: 'Marked', count: data.summary.markedForReview },
  ]

  return (
    <div className="answer-review-page">
      <div className="page-header">
        <div>
          <p className="muted">Student · Results · Answer review</p>
          <h1>Review your answers</h1>
          <p className="muted">
            Compare each response with the correct answer and learn from the
            explanation.
          </p>
        </div>
        <div className="button-row answer-review-header-actions">
          <Link className="button button-secondary" to="/student/results">
            <ArrowLeft size={17} />
            Back to results
          </Link>
          <Link className="button" to="/student/practice">
            <Sparkles size={17} />
            New practice
          </Link>
        </div>
      </div>

      <div className="answer-review-hero-grid">
        <Card className="answer-review-score-card">
          <div
            className="answer-review-score-ring"
            style={{
              background: `conic-gradient(var(--gold) ${data.summary.scorePercent * 3.6}deg, #23324a 0deg)`,
            }}
          >
            <div>
              <strong>{data.summary.scorePercent}%</strong>
              <span>Score</span>
            </div>
          </div>
          <div>
            <Badge tone={scoreTone(data.summary.scorePercent)}>
              {scoreLabel(data.summary.scorePercent)}
            </Badge>
            <h2>{data.subject.name} Practice</h2>
            <p className="muted">
              Completed {new Date(data.completedAt).toLocaleString()}
            </p>
            <div className="answer-review-score-meta">
              <span>
                <Sparkles size={15} />+{data.summary.xpEarned} XP
              </span>
              <span>
                <Clock3 size={15} />
                {formatDuration(data.summary.timeTakenSeconds)}
              </span>
            </div>
          </div>
        </Card>

        <Card className="answer-review-feedback-card">
          <div className="result-section-heading">
            <div className="result-icon purple">
              <BrainCircuit size={21} />
            </div>
            <div>
              <Badge tone="purple">AI feedback</Badge>
              <h3>What to focus on</h3>
            </div>
          </div>
          <p>{data.aiFeedback}</p>
        </Card>
      </div>

      <div className="stat-grid answer-review-stat-grid">
        <StatCard
          detail="Answered correctly"
          icon={<CheckCircle2 />}
          label="Correct"
          value={data.summary.correctAnswers}
        />
        <StatCard
          detail="Review the explanations"
          icon={<XCircle />}
          label="Wrong"
          value={data.summary.wrongAnswers}
        />
        <StatCard
          detail="No answer selected"
          icon={<MinusCircle />}
          label="Skipped"
          value={data.summary.skipped}
        />
        <StatCard
          detail="Flagged during practice"
          icon={<Flag />}
          label="Marked"
          value={data.summary.markedForReview}
        />
      </div>

      <div className="answer-review-layout">
        <main className="answer-review-main">
          <Card className="answer-review-filter-card">
            <div>
              <p className="muted">Question review</p>
              <h3>
                Showing {filteredQuestions.length} of {data.questions.length}
              </h3>
            </div>
            <div className="answer-review-filters" aria-label="Review filters">
              {filters.map((item) => (
                <button
                  className={filter === item.key ? 'active' : ''}
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                >
                  {item.label}
                  <span>{item.count}</span>
                </button>
              ))}
            </div>
          </Card>

          {filteredQuestions.length === 0 ? (
            <Card>
              <div className="answer-review-empty">
                <BookOpenCheck size={38} />
                <h3>No questions in this filter</h3>
                <p className="muted">
                  Choose another status to continue reviewing your answers.
                </p>
                <Button type="button" onClick={() => setFilter('all')}>
                  Show all questions
                </Button>
              </div>
            </Card>
          ) : (
            <div className="answer-review-question-list">
              {filteredQuestions.map((question) => (
                <QuestionReviewCard key={question.id} question={question} />
              ))}
            </div>
          )}
        </main>

        <aside className="answer-review-sidebar">
          <Card>
            <p className="muted">Topic performance</p>
            <h3>Mastery breakdown</h3>
            <div className="answer-review-topic-list">
              {data.topicBreakdown.map((topic) => (
                <div className="answer-review-topic" key={topic.topicId}>
                  <div className="row-between">
                    <div>
                      <strong>{topic.topicName}</strong>
                      <p className="muted">
                        {topic.correct}/{topic.total} correct
                      </p>
                    </div>
                    <strong>{topic.scorePercent}%</strong>
                  </div>
                  <div className="answer-review-topic-progress">
                    <span style={{ width: `${topic.scorePercent}%` }} />
                  </div>
                  <Link
                    className="student-text-link"
                    to={`/student/practice?subjectId=${data.subject.id}&topicId=${topic.topicId}`}
                  >
                    Retry this topic
                  </Link>
                </div>
              ))}
            </div>
          </Card>

          <Card className="answer-review-next-card">
            <Lightbulb size={24} />
            <h3>Turn review into progress</h3>
            <p className="muted">
              Retry the weakest topic while the explanations are still fresh.
            </p>
            <Link
              className="button"
              to={`/student/practice?subjectId=${data.subject.id}&topicId=${weakestTopicId(data)}`}
            >
              Generate similar questions
            </Link>
            <Link className="button button-secondary" to="/student/progress">
              View progress
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function QuestionReviewCard({
  question,
}: {
  question: PracticeReviewData['questions'][number]
}) {
  return (
    <Card className={`answer-review-question status-${question.status}`}>
      <div className="answer-review-question-header">
        <div className="answer-review-question-number">
          {question.number}
        </div>
        <div className="answer-review-question-title">
          <div className="answer-review-question-badges">
            <Badge tone={statusTone(question.status)}>
              {statusLabel(question.status)}
            </Badge>
            <Badge tone="neutral">{question.topic.name}</Badge>
            {question.markedForReview && (
              <Badge tone="purple">
                <Flag size={12} /> Marked
              </Badge>
            )}
          </div>
          <div className="answer-review-question-meta">
            <span>
              <Gauge size={14} /> Difficulty {question.difficulty}
            </span>
            <span>
              <Clock3 size={14} />
              {formatDuration(question.timeTakenSeconds)}
            </span>
            <span>
              <Target size={14} /> {question.points} points
            </span>
          </div>
        </div>
      </div>

      <h2>{question.text}</h2>

      <div className="answer-review-options">
        {question.options.map((option, index) => {
          const isCorrect = option === question.correctAnswer
          const isSelected = option === question.selectedAnswer
          const classNames = [
            'answer-review-option',
            isCorrect ? 'correct-option' : '',
            isSelected && !isCorrect ? 'wrong-selected' : '',
            isSelected ? 'selected-option' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div className={classNames} key={option}>
              <span className="answer-review-option-letter">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="answer-review-option-text">{option}</span>
              <span className="answer-review-option-label">
                {isSelected && isCorrect
                  ? 'Your answer · Correct'
                  : isCorrect
                    ? 'Correct answer'
                    : isSelected
                      ? 'Your answer'
                      : ''}
              </span>
              {isCorrect ? (
                <CheckCircle2 size={19} />
              ) : isSelected ? (
                <XCircle size={19} />
              ) : null}
            </div>
          )
        })}
      </div>

      {question.status === 'skipped' && (
        <div className="answer-review-skipped-note">
          <MinusCircle size={17} />
          You did not select an answer for this question.
        </div>
      )}

      <details
        className="answer-review-explanation"
        open={question.status !== 'correct'}
      >
        <summary>
          <span>
            <Lightbulb size={17} /> Explanation
          </span>
          <ChevronDown size={17} />
        </summary>
        <p>{question.explanation}</p>
      </details>

      <div className="answer-review-question-actions">
        <Link
          className="student-text-link"
          to={`/student/practice?topicId=${question.topic.id}`}
        >
          Retry this topic
        </Link>
      </div>
    </Card>
  )
}

function weakestTopicId(data: PracticeReviewData) {
  const weakest = [...data.topicBreakdown].sort(
    (left, right) => left.scorePercent - right.scorePercent,
  )[0]
  return weakest?.topicId ?? ''
}

function statusTone(
  status: PracticeReviewQuestionStatus,
): 'success' | 'danger' | 'warning' {
  if (status === 'correct') return 'success'
  if (status === 'wrong') return 'danger'
  return 'warning'
}

function statusLabel(status: PracticeReviewQuestionStatus) {
  if (status === 'correct') return 'Correct'
  if (status === 'wrong') return 'Wrong'
  return 'Skipped'
}

function scoreTone(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 75) return 'success'
  if (score >= 50) return 'warning'
  return 'danger'
}

function scoreLabel(score: number) {
  if (score >= 75) return 'Strong result'
  if (score >= 50) return 'Progressing'
  return 'Needs practice'
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}m ${remaining}s`
}

function AnswerReviewSkeleton() {
  return (
    <div className="answer-review-page">
      <div className="skeleton answer-review-header-skeleton" />
      <div className="answer-review-hero-grid">
        <div className="skeleton answer-review-hero-skeleton" />
        <div className="skeleton answer-review-hero-skeleton" />
      </div>
      <div className="answer-review-layout">
        <div className="answer-review-question-list">
          {[1, 2, 3].map((item) => (
            <div className="skeleton answer-review-question-skeleton" key={item} />
          ))}
        </div>
        <div className="skeleton answer-review-sidebar-skeleton" />
      </div>
    </div>
  )
}
