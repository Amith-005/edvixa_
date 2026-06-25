import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  ArrowRight,
  Beaker,
  BookOpen,
  BrainCircuit,
  Check,
  Clock3,
  FlaskConical,
  Gauge,
  Lightbulb,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Badge, Button, Card } from '../../../components/ui'
import { api } from '../../../lib/api'
import type {
  CreatePracticeSessionResponse,
  PracticeSetupData,
  PracticeSubject,
} from './types'

type PracticeMode = 'adaptive' | 'standard'
type QuestionCount = 5 | 10 | 15 | 20

async function getPracticeSetup(): Promise<PracticeSetupData> {
  const response = await api.get<{ success: true; data: PracticeSetupData }>(
    '/practice/setup',
  )

  return response.data.data
}

export function PracticeSetupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedSubjectId = searchParams.get('subjectId') ?? ''
  const requestedTopicId = searchParams.get('topicId') ?? ''
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['practice-setup'],
    queryFn: getPracticeSetup,
  })

  const [subjectId, setSubjectId] = useState('')
  const [topicIds, setTopicIds] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState(2)
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10)
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('adaptive')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!data || subjectId) return

    const requestedSubject = data.subjects.find((subject) =>
      requestedSubjectId
        ? subject.id === requestedSubjectId
        : subject.topics.some((topic) => topic.id === requestedTopicId),
    )
    const requestedTopic = requestedSubject?.topics.find(
      (topic) => topic.id === requestedTopicId,
    )

    if (requestedSubject && requestedTopic) {
      setSubjectId(requestedSubject.id)
      setTopicIds([requestedTopic.id])
      setDifficulty(requestedTopic.difficultyLevel)
      return
    }

    setSubjectId(data.recommendation.subjectId ?? data.subjects[0]?.id ?? '')
    setTopicIds(data.recommendation.topicIds)
    setDifficulty(data.recommendation.difficulty)
    setQuestionCount(data.recommendation.questionCount)
    setPracticeMode(data.recommendation.practiceMode)
  }, [
    data,
    requestedSubjectId,
    requestedTopicId,
    subjectId,
  ])

  const selectedSubject = useMemo(
    () => data?.subjects.find((subject) => subject.id === subjectId) ?? null,
    [data, subjectId],
  )

  useEffect(() => {
    if (!selectedSubject) return

    setTopicIds((current) =>
      current.filter((topicId) =>
        selectedSubject.topics.some((topic) => topic.id === topicId),
      ),
    )
  }, [selectedSubject])

  const estimatedMinutes = Math.max(
    5,
    Math.ceil(questionCount * (1.1 + difficulty * 0.12)),
  )

  const createSession = useMutation({
    mutationFn: async () => {
      const response = await api.post<{
        success: true
        data: CreatePracticeSessionResponse
      }>('/practice/sessions', {
        subjectId,
        topicIds,
        difficulty,
        questionCount,
        practiceMode,
      })

      return response.data.data
    },
    onSuccess: (session) => {
      navigate(`/student/practice/${session.id}`)
    },
    onError: (requestError) => {
      setError(
        axios.isAxiosError(requestError)
          ? requestError.response?.data?.error?.message ??
              'Could not generate the practice session.'
          : 'Could not generate the practice session.',
      )
    },
  })

  const selectSubject = (subject: PracticeSubject) => {
    setSubjectId(subject.id)
    setTopicIds([])
    setError('')
  }

  const toggleTopic = (topicId: string) => {
    if (!data) return

    setError('')
    setTopicIds((current) => {
      if (current.includes(topicId)) {
        return current.filter((id) => id !== topicId)
      }

      if (current.length >= data.limits.maximumTopics) {
        setError(
          `Choose up to ${data.limits.maximumTopics} topics for one session.`,
        )
        return current
      }

      return [...current, topicId]
    })
  }

  const applyRecommendation = () => {
    if (!data) return

    setSubjectId(data.recommendation.subjectId ?? data.subjects[0]?.id ?? '')
    setTopicIds(data.recommendation.topicIds)
    setDifficulty(data.recommendation.difficulty)
    setQuestionCount(data.recommendation.questionCount)
    setPracticeMode(data.recommendation.practiceMode)
    setError('')
  }

  const reset = () => {
    setSubjectId(data?.subjects[0]?.id ?? '')
    setTopicIds([])
    setDifficulty(2)
    setQuestionCount(10)
    setPracticeMode('adaptive')
    setError('')
  }

  const canGenerate = Boolean(subjectId && topicIds.length > 0)

  return (
    <>
      <div className="page-header">
        <div>
          <Badge tone="purple">AI-powered practice</Badge>
          <h1>Configure your session</h1>
          <p className="muted">
            Choose what to practise and Edvixa will prepare a focused session.
          </p>
        </div>
        <Button className="button-secondary" type="button" onClick={reset}>
          <RotateCcw size={17} />
          Reset
        </Button>
      </div>

      {isLoading ? (
        <PracticeSetupSkeleton />
      ) : isError || !data ? (
        <Card>
          <div className="practice-setup-error">
            <BrainCircuit size={36} />
            <div>
              <h3>Practice setup could not be loaded</h3>
              <p className="muted">
                Check the API connection and try loading the subjects again.
              </p>
            </div>
            <Button type="button" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        </Card>
      ) : data.subjects.length === 0 ? (
        <Card>
          <div className="student-empty-state">
            <BookOpen size={28} />
            <p>No AI-enabled subjects or topics are available yet.</p>
          </div>
        </Card>
      ) : (
        <div className="practice-setup-layout">
          <div className="practice-setup-main">
            <Card>
              <SectionHeading
                icon={<BookOpen size={20} />}
                number="1"
                subtitle="Choose the curriculum area"
                title="Select subject"
              />

              <div className="practice-subject-grid">
                {data.subjects.map((subject) => (
                  <button
                    className={
                      subject.id === subjectId
                        ? 'practice-subject-card selected'
                        : 'practice-subject-card'
                    }
                    key={subject.id}
                    type="button"
                    onClick={() => selectSubject(subject)}
                  >
                    <span className="practice-subject-icon">
                      {subject.slug === 'chemistry' ? (
                        <FlaskConical size={21} />
                      ) : subject.slug === 'physics' ? (
                        <Beaker size={21} />
                      ) : (
                        <BookOpen size={21} />
                      )}
                    </span>
                    <span>
                      <strong>{subject.name}</strong>
                      <small>{subject.topics.length} topics</small>
                    </span>
                    {subject.id === subjectId && <Check size={18} />}
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <SectionHeading
                icon={<BrainCircuit size={20} />}
                number="2"
                subtitle="Pick one or more areas"
                title="Focus topics"
              />

              {!selectedSubject ? (
                <div className="student-empty-state">
                  Select a subject to view its topics.
                </div>
              ) : (
                <div className="practice-topic-grid">
                  {selectedSubject.topics.map((topic) => {
                    const selected = topicIds.includes(topic.id)
                    return (
                      <button
                        className={
                          selected
                            ? 'practice-topic-chip selected'
                            : 'practice-topic-chip'
                        }
                        key={topic.id}
                        type="button"
                        onClick={() => toggleTopic(topic.id)}
                      >
                        <span>{topic.name}</span>
                        <small>Level {topic.difficultyLevel}</small>
                        {selected && <Check size={15} />}
                      </button>
                    )
                  })}
                </div>
              )}

              <p className="practice-helper-text">
                {topicIds.length} of {data.limits.maximumTopics} topics selected
              </p>
            </Card>

            <Card>
              <SectionHeading
                icon={<Gauge size={20} />}
                number="3"
                subtitle="Tailor the length and challenge"
                title="Session parameters"
              />

              <div className="practice-parameter-grid">
                <fieldset className="practice-fieldset">
                  <legend>Difficulty</legend>
                  <div className="practice-choice-row">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        className={
                          difficulty === value
                            ? 'practice-choice selected'
                            : 'practice-choice'
                        }
                        key={value}
                        type="button"
                        onClick={() => setDifficulty(value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <small className="muted">
                    {difficulty <= 2
                      ? 'Foundation'
                      : difficulty <= 4
                        ? 'Intermediate'
                        : 'Advanced'}
                  </small>
                </fieldset>

                <fieldset className="practice-fieldset">
                  <legend>Question count</legend>
                  <div className="practice-choice-row">
                    {data.limits.questionCounts.map((count) => (
                      <button
                        className={
                          questionCount === count
                            ? 'practice-choice selected'
                            : 'practice-choice'
                        }
                        key={count}
                        type="button"
                        onClick={() => setQuestionCount(count)}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                  <small className="muted">
                    About {estimatedMinutes} minutes
                  </small>
                </fieldset>
              </div>

              <div className="practice-mode-grid">
                <button
                  className={
                    practiceMode === 'adaptive'
                      ? 'practice-mode-card selected'
                      : 'practice-mode-card'
                  }
                  type="button"
                  onClick={() => setPracticeMode('adaptive')}
                >
                  <Sparkles size={21} />
                  <span>
                    <strong>AI adaptive</strong>
                    <small>Adjusts the session around your learning profile.</small>
                  </span>
                </button>
                <button
                  className={
                    practiceMode === 'standard'
                      ? 'practice-mode-card selected'
                      : 'practice-mode-card'
                  }
                  type="button"
                  onClick={() => setPracticeMode('standard')}
                >
                  <BookOpen size={21} />
                  <span>
                    <strong>Standard</strong>
                    <small>Uses the same selected difficulty throughout.</small>
                  </span>
                </button>
              </div>
            </Card>
          </div>

          <aside className="practice-setup-sidebar">
            <Card className="practice-recommendation-card">
              <Badge tone="purple">Smart next step</Badge>
              <h3>Recommended for you</h3>
              <p>{data.recommendation.reason}</p>
              <Button type="button" onClick={applyRecommendation}>
                <Sparkles size={17} />
                Apply recommendation
              </Button>
            </Card>

            <Card className="practice-blueprint-card">
              <p className="muted">Session blueprint</p>
              <h3>{selectedSubject?.name ?? 'Choose a subject'}</h3>

              <dl className="practice-blueprint-list">
                <div>
                  <dt>Topics</dt>
                  <dd>{topicIds.length || '—'}</dd>
                </div>
                <div>
                  <dt>Difficulty</dt>
                  <dd>{difficulty}/5</dd>
                </div>
                <div>
                  <dt>Questions</dt>
                  <dd>{questionCount}</dd>
                </div>
                <div>
                  <dt>Estimated time</dt>
                  <dd>{estimatedMinutes} min</dd>
                </div>
                <div>
                  <dt>Mode</dt>
                  <dd>{practiceMode === 'adaptive' ? 'Adaptive' : 'Standard'}</dd>
                </div>
              </dl>

              {error && <div className="alert error">{error}</div>}

              <Button
                disabled={!canGenerate || createSession.isPending}
                type="button"
                onClick={() => {
                  setError('')
                  createSession.mutate()
                }}
              >
                {createSession.isPending ? (
                  <>
                    <LoaderCircle className="spin" size={18} />
                    Preparing...
                  </>
                ) : (
                  <>
                    Generate Practice
                    <ArrowRight size={18} />
                  </>
                )}
              </Button>

              <div className="practice-estimate-note">
                <Clock3 size={16} />
                You can review your choices before the session starts.
              </div>
            </Card>

            <Card className="practice-tip-card">
              <Lightbulb size={20} />
              <div>
                <strong>Study tip</strong>
                <p className="muted">
                  One or two focused topics usually produce better feedback than
                  a very broad session.
                </p>
              </div>
            </Card>
          </aside>
        </div>
      )}
    </>
  )
}

function SectionHeading({
  number,
  title,
  subtitle,
  icon,
}: {
  number: string
  title: string
  subtitle: string
  icon: React.ReactNode
}) {
  return (
    <div className="practice-section-heading">
      <span>{number}</span>
      <div className="practice-section-icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p className="muted">{subtitle}</p>
      </div>
    </div>
  )
}

function PracticeSetupSkeleton() {
  return (
    <div className="practice-setup-layout">
      <div className="practice-setup-main">
        {[1, 2, 3].map((item) => (
          <div className="skeleton practice-setup-skeleton" key={item} />
        ))}
      </div>
      <div className="skeleton practice-sidebar-skeleton" />
    </div>
  )
}
