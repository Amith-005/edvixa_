import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { Badge, Button, Card, StatCard } from '../../../components/ui'
import { api } from '../../../lib/api'
import type { PracticeResultData } from './types'

async function getPracticeResult(id: string): Promise<PracticeResultData> {
  const response = await api.get<{
    success: true
    data: PracticeResultData
  }>(`/practice/sessions/${id}/result`)

  return response.data.data
}

export function PracticeResultPage() {
  const { id = '' } = useParams()

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['practice-result', id],
    queryFn: () => getPracticeResult(id),
    enabled: Boolean(id),
  })

  if (isLoading) return <ResultSkeleton />

  if (isError || !data) {
    return (
      <Card>
        <div className="result-error-state">
          <BrainCircuit size={38} />
          <div>
            <h3>We could not load this practice result</h3>
            <p className="muted">
              The result may not exist, or the API may be unavailable.
            </p>
          </div>
          <Button disabled={isFetching} onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </Card>
    )
  }

  const performanceLabel =
    data.summary.scorePercent >= 80
      ? 'Excellent progress'
      : data.summary.scorePercent >= 60
        ? 'Good progress'
        : 'Keep practising'

  return (
    <div className="practice-result-page">
      <div className="page-header">
        <div>
          <p className="muted">Student · Results · Practice summary</p>
          <h1>Your practice results are ready</h1>
          <p className="muted">
            Review your score, topic mastery, feedback, and next steps.
          </p>
        </div>
        <div className="button-row">
          <Link className="button button-secondary" to="/student/dashboard">
            <ArrowLeft size={17} />
            Dashboard
          </Link>
          <Link className="button" to="/student/practice">
            New practice
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>

      <div className="result-hero-grid">
        <Card className="result-score-card">
          <div
            aria-label={`${data.summary.scorePercent}% score`}
            className="result-score-ring"
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
            <Badge
              tone={data.summary.scorePercent >= 60 ? 'success' : 'warning'}
            >
              {performanceLabel}
            </Badge>
            <h2>{data.subject.name} Practice</h2>
            <p className="muted">
              Completed {new Date(data.completedAt).toLocaleString()}
            </p>
            {data.level.levelUp && (
              <div className="result-level-up">
                <Trophy size={18} />
                Level up! You reached level {data.level.after}.
              </div>
            )}
          </div>
        </Card>

        <Card className="result-ai-card">
          <div className="result-section-heading">
            <div className="result-icon purple">
              <Sparkles size={21} />
            </div>
            <div>
              <Badge tone="purple">Personalised feedback</Badge>
              <h3>Performance review</h3>
            </div>
          </div>
          <p>{data.aiFeedback}</p>
        </Card>
      </div>

      <div className="stat-grid result-stat-grid">
        <StatCard
          detail={`${data.summary.totalQuestions} total questions`}
          icon={<CheckCircle2 />}
          label="Correct"
          value={data.summary.correctAnswers}
        />
        <StatCard
          detail="Review these answers"
          icon={<XCircle />}
          label="Wrong"
          value={data.summary.wrongAnswers}
        />
        <StatCard
          detail="Questions left unanswered"
          icon={<Target />}
          label="Skipped"
          value={data.summary.skipped}
        />
        <StatCard
          detail={formatDuration(data.summary.timeTakenSeconds)}
          icon={<Clock3 />}
          label="XP earned"
          value={`+${data.summary.xpEarned}`}
        />
      </div>

      <div className="result-content-grid">
        <Card>
          <div className="row-between">
            <div>
              <p className="muted">Performance by topic</p>
              <h3>Topic mastery breakdown</h3>
            </div>
            <Badge tone="purple">
              {data.topicBreakdown.length} topics
            </Badge>
          </div>

          <div className="result-topic-list">
            {data.topicBreakdown.map((topic) => (
              <div className="result-topic-row" key={topic.topicId}>
                <div className="row-between">
                  <div>
                    <strong>{topic.topicName}</strong>
                    <p className="muted">
                      {topic.correct} correct · {topic.wrong} wrong ·{' '}
                      {topic.skipped} skipped
                    </p>
                  </div>
                  <strong>{topic.scorePercent}%</strong>
                </div>
                <div className="result-topic-progress">
                  <span style={{ width: `${topic.scorePercent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="result-section-heading">
            <div className="result-icon">
              <BrainCircuit size={21} />
            </div>
            <div>
              <p className="muted">Learning insight</p>
              <h3>Strengths and focus areas</h3>
            </div>
          </div>

          <ResultChipGroup
            empty="Complete more questions to identify strong topics."
            label="Strengths"
            tone="strong"
            values={data.strengths}
          />
          <ResultChipGroup
            empty="No major weak topic was detected in this attempt."
            label="Needs attention"
            tone="weak"
            values={data.weaknesses}
          />
        </Card>
      </div>

      <Card>
        <div className="row-between result-next-header">
          <div>
            <p className="muted">Recommended next steps</p>
            <h3>Keep your momentum going</h3>
          </div>
          <Link
            className="student-text-link"
            to={`/student/results/${data.id}/review`}
          >
            Review answers
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="result-recommendation-grid">
          {data.recommendations.map((recommendation, index) => (
            <div className="result-recommendation" key={recommendation}>
              <span>{index + 1}</span>
              <p>{recommendation}</p>
            </div>
          ))}
        </div>

        <div className="button-row result-actions">
          <Link
            className="button button-secondary"
            to={`/student/results/${data.id}/review`}
          >
            Review answers
          </Link>
          <Link className="button button-secondary" to="/student/progress">
            View progress
          </Link>
          <Link className="button" to="/student/practice">
            <RotateCcw size={17} />
            Generate new practice
          </Link>
        </div>
      </Card>
    </div>
  )
}

function ResultChipGroup({
  label,
  values,
  empty,
  tone,
}: {
  label: string
  values: string[]
  empty: string
  tone: 'strong' | 'weak'
}) {
  return (
    <div className="result-chip-group">
      <strong>{label}</strong>
      {values.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <div className="result-chip-list">
          {values.map((value) => (
            <span className={`result-chip ${tone}`} key={value}>
              {value}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}m ${remaining}s`
}

function ResultSkeleton() {
  return (
    <>
      <div className="skeleton result-header-skeleton" />
      <div className="result-hero-grid">
        <div className="skeleton result-panel-skeleton" />
        <div className="skeleton result-panel-skeleton" />
      </div>
      <div className="stat-grid">
        {[1, 2, 3, 4].map((item) => (
          <div className="skeleton" key={item} />
        ))}
      </div>
    </>
  )
}
