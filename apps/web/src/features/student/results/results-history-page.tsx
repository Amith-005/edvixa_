import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  Clock3,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge, Button, Card, Input, StatCard } from '../../../components/ui'
import { api } from '../../../lib/api'
import type { PracticeResultsHistoryData } from './types'

type SubjectOption = {
  _id: string
  name: string
}

async function getResults(params: {
  search: string
  subjectId: string
  sort: string
  page: number
}): Promise<PracticeResultsHistoryData> {
  const response = await api.get<{
    success: true
    data: PracticeResultsHistoryData
  }>('/practice/results', {
    params: {
      search: params.search || undefined,
      subjectId: params.subjectId || undefined,
      sort: params.sort,
      page: params.page,
      limit: 8,
    },
  })

  return response.data.data
}

export function ResultsHistoryPage() {
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [sort, setSort] = useState('recent')
  const [page, setPage] = useState(1)

  const resultsQuery = useQuery({
    queryKey: ['practice-results', search, subjectId, sort, page],
    queryFn: () => getResults({ search, subjectId, sort, page }),
  })

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: () =>
      api
        .get<{ success: true; data: SubjectOption[] }>('/subjects')
        .then((response) => response.data.data),
  })

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    setPage(1)
    setSearch(searchDraft.trim())
  }

  const clearFilters = () => {
    setSearchDraft('')
    setSearch('')
    setSubjectId('')
    setSort('recent')
    setPage(1)
  }

  const data = resultsQuery.data

  return (
    <div className="results-history-page">
      <div className="page-header">
        <div>
          <p className="muted">Student · Results</p>
          <h1>Practice history</h1>
          <p className="muted">
            Review every completed practice and track how your scores improve.
          </p>
        </div>
        <Link className="button" to="/student/practice">
          <Sparkles size={18} />
          Start new practice
        </Link>
      </div>

      {data && (
        <div className="stat-grid">
          <StatCard
            detail="Completed practices"
            icon={<BookOpenCheck />}
            label="Total results"
            value={data.summary.totalCompleted}
          />
          <StatCard
            detail="Across all practices"
            icon={<Target />}
            label="Average score"
            value={`${data.summary.averageScore}%`}
          />
          <StatCard
            detail="Your highest result"
            icon={<Trophy />}
            label="Best score"
            value={`${data.summary.bestScore}%`}
          />
          <StatCard
            detail="From completed practices"
            icon={<Sparkles />}
            label="XP earned"
            value={data.summary.totalXpEarned}
          />
        </div>
      )}

      <Card className="results-filter-card">
        <form className="results-search-form" onSubmit={submitSearch}>
          <label>
            Search by subject
            <div className="results-search-input">
              <Search size={17} />
              <Input
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Example: Chemistry"
                value={searchDraft}
              />
            </div>
          </label>

          <label>
            Subject
            <select
              className="input results-select"
              onChange={(event) => {
                setSubjectId(event.target.value)
                setPage(1)
              }}
              value={subjectId}
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
            Sort
            <select
              className="input results-select"
              onChange={(event) => {
                setSort(event.target.value)
                setPage(1)
              }}
              value={sort}
            >
              <option value="recent">Most recent</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest score</option>
              <option value="lowest">Lowest score</option>
            </select>
          </label>

          <div className="results-filter-actions">
            <Button type="submit">
              <Filter size={17} />
              Apply
            </Button>
            <Button
              className="button-secondary"
              onClick={clearFilters}
              type="button"
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>

      {resultsQuery.isLoading ? (
        <HistorySkeleton />
      ) : resultsQuery.isError || !data ? (
        <Card>
          <div className="results-history-error">
            <BrainCircuit size={38} />
            <div>
              <h3>We could not load your practice history</h3>
              <p className="muted">
                Check that the API is running, then try again.
              </p>
            </div>
            <Button onClick={() => resultsQuery.refetch()}>
              <RefreshCw size={17} />
              Try again
            </Button>
          </div>
        </Card>
      ) : data.items.length === 0 ? (
        <Card>
          <div className="results-empty-state">
            <BookOpenCheck size={42} />
            <h3>No matching practice results</h3>
            <p className="muted">
              Complete a practice session or reset the filters to see results.
            </p>
            <Link className="button" to="/student/practice">
              Start AI Practice
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="results-history-list">
            {data.items.map((result) => (
              <Card className="result-history-card" key={result.id}>
                <div className="result-history-main">
                  <div className="result-history-score">
                    <strong>{result.scorePercent}%</strong>
                    <span>Score</span>
                  </div>

                  <div className="result-history-copy">
                    <div className="result-history-title-row">
                      <div>
                        <h3>{result.subject.name} Practice</h3>
                        <p className="muted">
                          {new Date(result.completedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge tone={scoreTone(result.scorePercent)}>
                        {scoreLabel(result.scorePercent)}
                      </Badge>
                    </div>

                    <div className="result-history-meta">
                      <span>
                        <BookOpenCheck size={15} />
                        {result.questionCount} questions
                      </span>
                      <span>
                        <Sparkles size={15} />+{result.xpEarned} XP
                      </span>
                      <span>
                        <Clock3 size={15} />
                        {formatDuration(result.timeTakenSeconds)}
                      </span>
                      <span>
                        <Target size={15} />
                        Difficulty {result.difficulty}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="result-history-actions">
                  <Link
                    className="button button-secondary"
                    to={`/student/results/${result.id}/review`}
                  >
                    Review answers
                  </Link>
                  <Link
                    className="button"
                    to={`/student/results/${result.id}`}
                  >
                    View result
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          <div className="results-pagination">
            <Button
              className="button-secondary"
              disabled={data.pagination.page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </Button>
            <span>
              Page {data.pagination.page} of {data.pagination.totalPages}
            </span>
            <Button
              className="button-secondary"
              disabled={data.pagination.page >= data.pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function scoreTone(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 75) return 'success'
  if (score >= 50) return 'warning'
  return 'danger'
}

function scoreLabel(score: number) {
  if (score >= 75) return 'Strong'
  if (score >= 50) return 'Progressing'
  return 'Needs practice'
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}m ${remaining}s`
}

function HistorySkeleton() {
  return (
    <div className="results-history-list">
      {[1, 2, 3].map((item) => (
        <div className="skeleton results-history-skeleton" key={item} />
      ))}
    </div>
  )
}
