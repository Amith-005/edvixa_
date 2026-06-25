import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  Clock3,
  Download,
  Flame,
  GraduationCap,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'

import { Badge, Button, Card, StatCard } from '../../../components/ui'
import { api } from '../../../lib/api'
import type {
  ProgressRange,
  ProgressTopic,
  StudentProgressData,
} from './types'

async function getProgress(
  range: ProgressRange,
  subjectId: string,
): Promise<StudentProgressData> {
  const response = await api.get<{
    success: true
    data: StudentProgressData
  }>('/students/progress', {
    params: {
      range,
      subjectId: subjectId || undefined,
    },
  })

  return response.data.data
}

const rangeOptions: Array<{ value: ProgressRange; label: string }> = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
]

export function StudentProgressPage() {
  const [range, setRange] = useState<ProgressRange>('30d')
  const [subjectId, setSubjectId] = useState('')

  const progressQuery = useQuery({
    queryKey: ['student-progress', range, subjectId],
    queryFn: () => getProgress(range, subjectId),
  })

  const data = progressQuery.data

  const exportReport = () => {
    if (!data) return

    const rows = [
      ['Edvixa Student Progress Report'],
      ['Subject', data.selectedSubjectName],
      ['Time range', rangeLabel(data.filters.range)],
      ['Completed practices', data.summary.completedSessions],
      ['Average score', `${data.summary.averageScore}%`],
      ['XP earned', data.summary.xpEarned],
      ['Practice minutes', data.summary.practiceMinutes],
      [],
      ['Topic', 'Mastery', 'Attempts', 'Correct', 'Wrong'],
      ...data.topicMastery.map((topic) => [
        topic.name,
        `${topic.masteryScore}%`,
        topic.attemptCount,
        topic.correctCount,
        topic.wrongCount,
      ]),
    ]

    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n')
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `edvixa-progress-${data.filters.range}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="student-progress-page">
      <div className="page-header">
        <div>
          <p className="muted">Student · Progress</p>
          <h1>Learning progress</h1>
          <p className="muted">
            Track your scores, XP, topic mastery, and study consistency.
          </p>
        </div>
        <div className="progress-header-actions button-row">
          <Link className="button button-secondary" to="/student/results">
            <BookOpenCheck size={17} />
            Test history
          </Link>
          <Button disabled={!data} onClick={exportReport} type="button">
            <Download size={17} />
            Export report
          </Button>
        </div>
      </div>

      <Card className="progress-filter-card">
        <label>
          Subject
          <select
            className="input progress-filter-select"
            onChange={(event) => setSubjectId(event.target.value)}
            value={subjectId}
          >
            <option value="">All subjects</option>
            {(data?.subjects ?? []).map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend>Time range</legend>
          <div className="progress-range-buttons">
            {rangeOptions.map((option) => (
              <button
                className={range === option.value ? 'active' : ''}
                key={option.value}
                onClick={() => setRange(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      </Card>

      {progressQuery.isLoading ? (
        <ProgressSkeleton />
      ) : progressQuery.isError || !data ? (
        <Card>
          <div className="progress-error-state">
            <BrainCircuit size={40} />
            <div>
              <h3>We could not load your progress</h3>
              <p className="muted">
                Check that the API is running, then try again.
              </p>
            </div>
            <Button onClick={() => progressQuery.refetch()} type="button">
              <RefreshCw size={17} />
              Try again
            </Button>
          </div>
        </Card>
      ) : (
        <ProgressContent data={data} />
      )}
    </div>
  )
}

function ProgressContent({ data }: { data: StudentProgressData }) {
  return (
    <>
      <div className="stat-grid">
        <StatCard
          detail={`${data.summary.xp} total XP`}
          icon={<GraduationCap />}
          label="Current level"
          value={data.summary.level}
        />
        <StatCard
          detail={`${data.summary.completedSessions} practices in this range`}
          icon={<Target />}
          label="Average score"
          value={`${data.summary.averageScore}%`}
        />
        <StatCard
          detail={`+${data.summary.xpEarned} XP in this range`}
          icon={<TrendingUp />}
          label="XP growth"
          value={data.summary.xpEarned}
        />
        <StatCard
          detail={`${data.summary.streak} day streak`}
          icon={<Clock3 />}
          label="Practice time"
          value={formatMinutes(data.summary.practiceMinutes)}
        />
      </div>

      {data.summary.completedSessions === 0 ? (
        <Card>
          <div className="progress-empty-state">
            <BarChart3 size={44} />
            <h3>No progress data for this filter</h3>
            <p className="muted">
              Complete a practice in {data.selectedSubjectName.toLowerCase()} or
              choose another time range.
            </p>
            <Link className="button" to="/student/practice">
              <Sparkles size={17} />
              Start AI practice
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="progress-chart-grid">
            <Card className="progress-chart-card">
              <ChartHeading
                description="Practice score across completed sessions"
                title="Score trend"
              />
              <LineChart
                ariaLabel="Score trend chart"
                maxValue={100}
                points={data.trend.map((point) => ({
                  date: point.date,
                  value: point.score,
                }))}
                suffix="%"
              />
            </Card>

            <Card className="progress-chart-card">
              <ChartHeading
                description="Cumulative XP earned in the selected period"
                title="XP and level growth"
              />
              <LineChart
                ariaLabel="XP growth chart"
                points={data.trend.map((point) => ({
                  date: point.date,
                  value: point.cumulativeXp,
                }))}
                suffix=" XP"
              />
              <div className="progress-level-note">
                <GraduationCap size={18} />
                Current level {data.summary.level} · Overall accuracy{' '}
                {data.summary.accuracyPercent}%
              </div>
            </Card>
          </div>

          <div className="progress-content-grid">
            <Card>
              <ChartHeading
                description="Mastery updates after every completed practice"
                title="Topic mastery"
              />
              {data.topicMastery.length > 0 ? (
                <div className="progress-mastery-list">
                  {data.topicMastery.slice(0, 8).map((topic) => (
                    <MasteryRow key={topic.id} topic={topic} />
                  ))}
                </div>
              ) : (
                <SmallEmpty text="Practice more topics to build your mastery profile." />
              )}
            </Card>

            <Card>
              <ChartHeading
                description="Your strongest areas and topics needing attention"
                title="Learning focus"
              />
              <div className="progress-focus-section">
                <div>
                  <h4>Strong topics</h4>
                  <TopicChips topics={data.strongTopics} tone="success" />
                </div>
                <div>
                  <h4>Weak topics</h4>
                  <TopicChips topics={data.weakTopics} tone="danger" />
                </div>
              </div>
              {data.weakTopics.length > 0 ? (
                <Link className="button progress-wide-button" to="/student/practice">
                  <Sparkles size={17} />
                  Start weak-topic practice
                </Link>
              ) : (
                <Link
                  className="button button-secondary progress-wide-button"
                  to="/student/practice"
                >
                  <Sparkles size={17} />
                  Continue practising
                </Link>
              )}
            </Card>
          </div>

          <div className="progress-content-grid">
            <Card>
              <ChartHeading
                description="Each square represents one day of learning activity"
                title="Learning heatmap"
              />
              <div className="learning-heatmap" aria-label="Learning activity heatmap">
                {data.heatmap.map((day) => (
                  <span
                    aria-label={`${day.date}: ${day.sessions} sessions, ${day.minutes} minutes`}
                    className={`heatmap-cell intensity-${day.intensity}`}
                    key={day.date}
                    title={`${formatDate(day.date)} · ${day.sessions} session${day.sessions === 1 ? '' : 's'} · ${formatMinutes(day.minutes)}`}
                  />
                ))}
              </div>
              <div className="heatmap-legend">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <span
                    className={`heatmap-cell intensity-${level}`}
                    key={level}
                  />
                ))}
                <span>More</span>
              </div>
            </Card>

            <Card>
              <ChartHeading
                description="Performance by subject for the selected range"
                title="Subject performance"
              />
              {data.subjectPerformance.length > 0 ? (
                <div className="subject-performance-list">
                  {data.subjectPerformance.map((subject) => (
                    <div className="subject-performance-row" key={subject.subjectId}>
                      <div>
                        <strong>{subject.subjectName}</strong>
                        <p className="muted">
                          {subject.sessions} practices ·{' '}
                          {formatMinutes(subject.totalMinutes)}
                        </p>
                      </div>
                      <Badge tone={scoreTone(subject.averageScore)}>
                        {subject.averageScore}%
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <SmallEmpty text="No subject activity is available for this range." />
              )}
              <Link className="progress-text-link" to="/student/results">
                View complete test history
                <ArrowRight size={16} />
              </Link>
            </Card>
          </div>
        </>
      )}
    </>
  )
}

function ChartHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="progress-card-heading">
      <div>
        <h3>{title}</h3>
        <p className="muted">{description}</p>
      </div>
    </div>
  )
}

function LineChart({
  points,
  maxValue,
  suffix,
  ariaLabel,
}: {
  points: Array<{ date: string; value: number }>
  maxValue?: number
  suffix: string
  ariaLabel: string
}) {
  if (points.length === 0) {
    return <SmallEmpty text="Complete more practices to create this chart." />
  }

  const width = 660
  const height = 230
  const paddingX = 36
  const paddingY = 28
  const observedMaximum = Math.max(...points.map((point) => point.value), 1)
  const ceiling = Math.max(maxValue ?? 0, observedMaximum)
  const chartWidth = width - paddingX * 2
  const chartHeight = height - paddingY * 2

  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : paddingX + (index / (points.length - 1)) * chartWidth
    const y = paddingY + chartHeight - (point.value / ceiling) * chartHeight
    return { ...point, x, y }
  })

  const line = coordinates.map((point) => `${point.x},${point.y}`).join(' ')
  const first = coordinates[0]
  const last = coordinates.at(-1)

  return (
    <div className="progress-line-chart">
      <svg aria-label={ariaLabel} role="img" viewBox={`0 0 ${width} ${height}`}>
        {[0, 1, 2, 3, 4].map((lineIndex) => {
          const y = paddingY + (lineIndex / 4) * chartHeight
          return (
            <line
              className="progress-chart-grid-line"
              key={lineIndex}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
            />
          )
        })}
        {coordinates.length > 1 && (
          <polyline className="progress-chart-line" points={line} />
        )}
        {coordinates.map((point) => (
          <g key={`${point.date}-${point.x}`}>
            <circle
              className="progress-chart-dot"
              cx={point.x}
              cy={point.y}
              r="5"
            />
            <title>
              {formatDate(point.date)}: {point.value}
              {suffix}
            </title>
          </g>
        ))}
      </svg>
      <div className="progress-chart-caption">
        <span>{first ? formatDate(first.date) : ''}</span>
        <strong>
          Latest: {last?.value ?? 0}
          {suffix}
        </strong>
        <span>{last ? formatDate(last.date) : ''}</span>
      </div>
    </div>
  )
}

function MasteryRow({ topic }: { topic: ProgressTopic }) {
  return (
    <div className="progress-mastery-row">
      <div className="row-between">
        <div>
          <strong>{topic.name}</strong>
          <p className="muted">
            {topic.attemptCount} attempts · {topic.correctCount} correct
          </p>
        </div>
        <strong>{topic.masteryScore}%</strong>
      </div>
      <div className="progress-mastery-track">
        <span style={{ width: `${topic.masteryScore}%` }} />
      </div>
    </div>
  )
}

function TopicChips({
  topics,
  tone,
}: {
  topics: ProgressTopic[]
  tone: 'success' | 'danger'
}) {
  if (topics.length === 0) {
    return (
      <p className="muted">
        {tone === 'success'
          ? 'Complete more practices to identify strong topics.'
          : 'No weak topic is currently detected.'}
      </p>
    )
  }

  return (
    <div className="progress-topic-chips">
      {topics.map((topic) => (
        <Badge key={topic.id} tone={tone}>
          {topic.name} · {topic.masteryScore}%
        </Badge>
      ))}
    </div>
  )
}

function SmallEmpty({ text }: { text: string }) {
  return <div className="progress-small-empty">{text}</div>
}

function ProgressSkeleton() {
  return (
    <div className="student-progress-page">
      <div className="stat-grid">
        {[1, 2, 3, 4].map((item) => (
          <div className="skeleton" key={item} />
        ))}
      </div>
      <div className="progress-chart-grid">
        <div className="skeleton progress-chart-skeleton" />
        <div className="skeleton progress-chart-skeleton" />
      </div>
      <div className="progress-content-grid">
        <div className="skeleton progress-panel-skeleton" />
        <div className="skeleton progress-panel-skeleton" />
      </div>
    </div>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function formatMinutes(value: number) {
  if (value < 1) return `${Math.round(value * 60)} sec`
  return `${Number.isInteger(value) ? value : value.toFixed(1)} min`
}

function rangeLabel(range: ProgressRange) {
  return rangeOptions.find((option) => option.value === range)?.label ?? range
}

function scoreTone(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 75) return 'success'
  if (score >= 50) return 'warning'
  return 'danger'
}

function csvCell(value: string | number | undefined) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}
