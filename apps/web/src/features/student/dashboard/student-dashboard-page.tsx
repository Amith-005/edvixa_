import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  Clock3,
  Flame,
  GraduationCap,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Badge, Button, Card, StatCard } from '../../../components/ui'
import { api } from '../../../lib/api'
import { useAuthStore } from '../../../stores/auth.store'
import type { DashboardTopic, StudentDashboardData } from './types'

async function getStudentDashboard(): Promise<StudentDashboardData> {
  const response = await api.get<{ success: true; data: StudentDashboardData }>(
    '/students/dashboard',
  )

  return response.data.data
}

export function StudentDashboardPage() {
  const user = useAuthStore((state) => state.user)!

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: getStudentDashboard,
  })

  const firstName = user.name.trim().split(/\s+/)[0] || user.name

  return (
    <>
      <PageHeader
        title={`Good day, ${firstName}!`}
        subtitle="Ready to continue your learning journey?"
        action={
          <Link className="button" to="/student/practice">
            <Sparkles size={18} />
            Start AI Practice
          </Link>
        }
      />

      {isLoading ? (
        <DashboardSkeleton />
      ) : isError || !data ? (
        <Card>
          <div className="student-dashboard-error">
            <BrainCircuit size={36} />
            <div>
              <h3>We could not load your learning dashboard</h3>
              <p className="muted">
                Check that the API and MongoDB are running, then try again.
              </p>
            </div>
            <Button disabled={isFetching} onClick={() => refetch()}>
              <RefreshCw size={17} />
              Try again
            </Button>
          </div>
        </Card>
      ) : (
        <div className="student-dashboard">
          <Card className="student-level-banner">
            <div>
              <Badge tone="purple">Level {data.profile.level}</Badge>
              <h2>Your next milestone is getting closer</h2>
              <p className="muted">
                {data.xp.remainingXp} XP remaining to reach level{' '}
                {data.profile.level + 1}.
              </p>
            </div>

            <div className="student-xp-panel">
              <div className="row-between">
                <strong>
                  {data.xp.currentLevelXp} / {data.xp.requiredForNextLevel} XP
                </strong>
                <span>{data.xp.progressPercent}%</span>
              </div>
              <div
                aria-label={`${data.xp.progressPercent}% XP progress`}
                className="progress"
              >
                <span style={{ width: `${data.xp.progressPercent}%` }} />
              </div>
            </div>
          </Card>

          <div className="stat-grid">
            <StatCard
              detail="Current learning level"
              icon={<GraduationCap />}
              label="Level"
              value={data.profile.level}
            />
            <StatCard
              detail="All-time experience"
              icon={<Target />}
              label="Total XP"
              value={data.profile.xp}
            />
            <StatCard
              detail="Keep the momentum going"
              icon={<Flame />}
              label="Day streak"
              value={`${data.profile.streak} days`}
            />
            <StatCard
              detail={`${data.profile.totalPracticeSessions} practice sessions`}
              icon={<BookOpenCheck />}
              label="Accuracy"
              value={`${Math.round(data.profile.accuracyPercent)}%`}
            />
          </div>

          <div className="student-dashboard-grid">
            <Card className="student-recommendation-card">
              <div className="student-card-heading">
                <div className="student-card-icon purple">
                  <Sparkles size={20} />
                </div>
                <div>
                  <Badge tone="purple">AI recommendation</Badge>
                  <h3>{data.recommendation.title}</h3>
                </div>
              </div>

              <p className="muted">{data.recommendation.description}</p>

              <Link
                className="student-text-link"
                to={data.recommendation.actionUrl}
              >
                {data.recommendation.actionLabel}
                <ArrowRight size={16} />
              </Link>
            </Card>

            <Card>
              <div className="student-card-heading">
                <div className="student-card-icon">
                  <Trophy size={20} />
                </div>
                <div>
                  <p className="muted">Learning snapshot</p>
                  <h3>Your activity so far</h3>
                </div>
              </div>

              <div className="student-mini-stats">
                <MiniStat
                  label="Practice sessions"
                  value={data.profile.totalPracticeSessions}
                />
                <MiniStat
                  label="Tests completed"
                  value={data.profile.totalTestsTaken}
                />
                <MiniStat
                  label="Practice minutes"
                  value={data.profile.totalPracticeTime}
                />
                <MiniStat
                  label="Average score"
                  value={`${Math.round(data.profile.averageScore)}%`}
                />
              </div>
            </Card>
          </div>

          <div className="student-dashboard-grid">
            <TopicCard
              emptyText="Complete a practice session to discover topics that need attention."
              title="Weak topics"
              topics={data.weakTopics}
              tone="weak"
            />
            <TopicCard
              emptyText="Your strongest topics will appear after you complete practice sessions."
              title="Strong topics"
              topics={data.strongTopics}
              tone="strong"
            />
          </div>

          <div className="student-dashboard-grid">
            <Card>
              <div className="row-between">
                <div>
                  <p className="muted">Latest updates</p>
                  <h3>Recent activity</h3>
                </div>
                <Link className="student-text-link" to="/student/results">
                  View results
                  <ArrowRight size={15} />
                </Link>
              </div>

              {data.recentActivity.length === 0 ? (
                <EmptyState
                  icon={<BookOpenCheck size={25} />}
                  text="Your completed practices and tests will appear here."
                />
              ) : (
                <div className="student-activity-list">
                  {data.recentActivity.map((activity) => (
                    <div className="student-list-row" key={activity.id}>
                      <div>
                        <strong>{activity.title}</strong>
                        <p className="muted">{activity.description}</p>
                      </div>
                      <time>
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </time>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="row-between">
                <div>
                  <p className="muted">Teacher support</p>
                  <h3>Upcoming sessions</h3>
                </div>
                <Link className="student-text-link" to="/student/teachers">
                  Book teacher
                  <ArrowRight size={15} />
                </Link>
              </div>

              {data.upcomingSessions.length === 0 ? (
                <EmptyState
                  icon={<Clock3 size={25} />}
                  text="You do not have an upcoming teacher session."
                />
              ) : (
                <div className="student-activity-list">
                  {data.upcomingSessions.map((session) => (
                    <div className="student-list-row" key={session.id}>
                      <div>
                        <strong>{session.teacherName}</strong>
                        <p className="muted">{session.subjectName}</p>
                      </div>
                      <time>
                        {new Date(session.scheduledAt).toLocaleString()}
                      </time>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  )
}

function TopicCard({
  title,
  topics,
  emptyText,
  tone,
}: {
  title: string
  topics: DashboardTopic[]
  emptyText: string
  tone: 'weak' | 'strong'
}) {
  return (
    <Card>
      <div className="row-between">
        <div>
          <p className="muted">Topic mastery</p>
          <h3>{title}</h3>
        </div>
        <Badge tone={tone === 'strong' ? 'success' : 'warning'}>
          {topics.length}
        </Badge>
      </div>

      {topics.length === 0 ? (
        <EmptyState icon={<BrainCircuit size={25} />} text={emptyText} />
      ) : (
        <div className="student-topic-list">
          {topics.map((topic) => (
            <div className="student-topic-row" key={topic.id}>
              <div className="row-between">
                <strong>{topic.name}</strong>
                <span>{Math.round(topic.masteryScore)}%</span>
              </div>
              <div className={`student-topic-progress ${tone}`}>
                <span style={{ width: `${topic.masteryScore}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function MiniStat({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="student-mini-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function EmptyState({
  icon,
  text,
}: {
  icon: ReactNode
  text: string
}) {
  return (
    <div className="student-empty-state">
      {icon}
      <p>{text}</p>
    </div>
  )
}

function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle: string
  action?: ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="skeleton student-banner-skeleton" />
      <div className="stat-grid">
        {[1, 2, 3, 4].map((item) => (
          <div className="skeleton" key={item} />
        ))}
      </div>
      <div className="student-dashboard-grid">
        <div className="skeleton student-panel-skeleton" />
        <div className="skeleton student-panel-skeleton" />
      </div>
    </>
  )
}
