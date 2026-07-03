import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Search,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button, Card, Input } from '../../../components/ui'
import {
  formatDate,
  formatMoney,
  getAdminData,
  getApiError,
  patchAdminData,
} from '../api'
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminModal,
  AdminPageHeader,
  AdminPagination,
  AdminTable,
  StatusBadge,
} from '../components'
import type { AdminTeacher, Paginated } from '../types'

type TeacherDecision = 'approved' | 'rejected'
type TeacherDisplayStatus = 'draft' | 'pending' | 'approved' | 'rejected'

const asArray = <T,>(value: T[] | null | undefined): T[] =>
  Array.isArray(value) ? value : []

const getDisplayStatus = (teacher: AdminTeacher): TeacherDisplayStatus => {
  if (teacher.isApproved || teacher.approvalStatus === 'approved') {
    return 'approved'
  }

  if (!teacher.submittedAt) {
    return 'draft'
  }

  return teacher.approvalStatus
}

const canReviewDecision = (teacher: AdminTeacher) =>
  Boolean(teacher.submittedAt) && getDisplayStatus(teacher) === 'pending'

export default function AdminTeachersPage() {
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('pending')
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AdminTeacher | null>(null)
  const [decision, setDecision] = useState<TeacherDecision>('approved')
  const [reason, setReason] = useState('')

  const query = useQuery({
    queryKey: ['admin', 'teachers', { page, status, search }],
    queryFn: () =>
      getAdminData<Paginated<AdminTeacher>>('/admin/teachers', {
        page,
        limit: 15,
        status,
        search: search || undefined,
      }),
  })

  const mutation = useMutation({
    mutationFn: () => {
      if (!selected) {
        throw new Error('Select a teacher application first')
      }

      return patchAdminData(`/admin/teachers/${selected._id}/decision`, {
        decision,
        reason: decision === 'rejected' ? reason : undefined,
      })
    },
    onSuccess: async () => {
      setSelected(null)
      setReason('')
      await client.invalidateQueries({ queryKey: ['admin', 'teachers'] })
      await client.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })

  const selectedData = useMemo(() => {
    if (!selected) return null

    const subjects = asArray(selected.subjects)
    const gradeLevels = asArray(selected.gradeLevels)
    const languages = asArray(selected.languages)
    const documents = asArray(selected.documents)
    const displayStatus = getDisplayStatus(selected)

    return {
      subjects,
      gradeLevels,
      languages,
      documents,
      displayStatus,
      canDecide: canReviewDecision(selected),
    }
  }, [selected])

  const openReview = (teacher: AdminTeacher, next: TeacherDecision = 'approved') => {
    setSelected(teacher)
    setDecision(next)
    setReason('')
    mutation.reset()
  }

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Teacher verification"
        subtitle="Review professional details, subjects, documents, and approval history before publishing a teacher."
      />

      <Card className="admin-filter-card">
        <form
          className="admin-filter-grid admin-filter-grid-compact"
          onSubmit={(event) => {
            event.preventDefault()
            setPage(1)
            setSearch(searchDraft.trim())
          }}
        >
          <label>
            Search
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Teacher, email, qualification"
            />
          </label>

          <label>
            Application status
            <select
              className="input"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
            >
              <option value="pending">Pending review</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
          </label>

          <Button>
            <Search size={16} />
            Apply
          </Button>
        </form>
      </Card>

      {query.isLoading ? (
        <AdminLoading />
      ) : query.isError ? (
        <AdminError onRetry={() => query.refetch()} />
      ) : !query.data || query.data.items.length === 0 ? (
        <AdminEmpty
          title="No teacher applications"
          message="No teacher profiles match the selected status and search."
        />
      ) : (
        <Card>
          <AdminTable
            headers={[
              'Teacher',
              'Qualification',
              'Subjects',
              'Profile',
              'Rate',
              'Status',
              'Actions',
            ]}
          >
            {query.data.items.map((teacher) => {
              const subjects = asArray(teacher.subjects)
              const displayStatus = getDisplayStatus(teacher)
              const isDecisionReady = canReviewDecision(teacher)

              return (
                <tr key={teacher._id}>
                  <td>
                    <strong>{teacher.userId?.name ?? 'Teacher'}</strong>
                    <small>{teacher.userId?.email ?? 'No email available'}</small>
                  </td>
                  <td>
                    {teacher.qualification || 'Not provided'}
                    <small>{teacher.experienceYears ?? 0} years experience</small>
                  </td>
                  <td>
                    {subjects.length === 0 ? (
                      <span className="muted">No subjects selected</span>
                    ) : (
                      <div className="admin-chip-row">
                        {subjects.slice(0, 3).map((subject) => (
                          <span className="admin-chip" key={subject._id}>
                            {subject.name}
                          </span>
                        ))}
                        {subjects.length > 3 && (
                          <span className="admin-chip">+{subjects.length - 3}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    {teacher.profileCompletedPercent ?? 0}%
                    <div className="admin-mini-progress">
                      <span
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, teacher.profileCompletedPercent ?? 0),
                          )}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td>{formatMoney(teacher.hourlyRate ?? 0)}/hr</td>
                  <td>
                    <StatusBadge value={displayStatus} />
                    {teacher.submittedAt && (
                      <small>Submitted {formatDate(teacher.submittedAt)}</small>
                    )}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <Button
                        className="button-secondary"
                        onClick={() => openReview(teacher)}
                      >
                        Review
                      </Button>

                      {isDecisionReady && (
                        <>
                          <Button
                            onClick={() => openReview(teacher, 'approved')}
                            title="Approve"
                          >
                            <CheckCircle2 size={16} />
                          </Button>
                          <Button
                            className="button-danger"
                            onClick={() => openReview(teacher, 'rejected')}
                            title="Reject"
                          >
                            <XCircle size={16} />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </AdminTable>
          <AdminPagination pagination={query.data.pagination} onPage={setPage} />
        </Card>
      )}

      {selected && selectedData && (
        <AdminModal
          title={`Review ${selected.userId?.name ?? 'teacher'}`}
          onClose={() => setSelected(null)}
        >
          {selectedData.displayStatus === 'draft' && (
            <div className="admin-review-notice admin-review-notice-warning">
              <AlertTriangle size={19} />
              <div>
                <strong>This profile is still a draft</strong>
                <p>
                  The teacher must complete the profile, upload the required
                  documents, and submit it for review before an administrator can
                  approve or reject it.
                </p>
              </div>
            </div>
          )}

          {selectedData.displayStatus === 'approved' && (
            <div className="admin-review-notice admin-review-notice-success">
              <CheckCircle2 size={19} />
              <div>
                <strong>This teacher is approved</strong>
                <p>The profile is published and eligible for student bookings.</p>
              </div>
            </div>
          )}

          {selectedData.displayStatus === 'rejected' && (
            <div className="admin-review-notice admin-review-notice-danger">
              <XCircle size={19} />
              <div>
                <strong>This application was rejected</strong>
                <p>{selected.rejectionReason || 'No rejection reason was recorded.'}</p>
              </div>
            </div>
          )}

          <div className="admin-review-grid">
            <div>
              <h3>Professional profile</h3>
              <p>{selected.bio || 'No biography provided.'}</p>

              <dl className="admin-definition-list">
                <div>
                  <dt>Email</dt>
                  <dd>{selected.userId?.email || '—'}</dd>
                </div>
                <div>
                  <dt>Qualification</dt>
                  <dd>{selected.qualification || '—'}</dd>
                </div>
                <div>
                  <dt>Experience</dt>
                  <dd>{selected.experienceYears ?? 0} years</dd>
                </div>
                <div>
                  <dt>Rate</dt>
                  <dd>{formatMoney(selected.hourlyRate ?? 0)}/hour</dd>
                </div>
                <div>
                  <dt>Grade levels</dt>
                  <dd>{selectedData.gradeLevels.join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt>Languages</dt>
                  <dd>{selectedData.languages.join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt>Subjects</dt>
                  <dd>
                    {selectedData.subjects.map((subject) => subject.name).join(', ') ||
                      '—'}
                  </dd>
                </div>
                <div>
                  <dt>Profile completeness</dt>
                  <dd>{selected.profileCompletedPercent ?? 0}%</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3>Documents</h3>
              {selectedData.documents.length === 0 ? (
                <p className="muted">No documents uploaded.</p>
              ) : (
                selectedData.documents.map((document) => (
                  <a
                    className="admin-document-link"
                    href={document.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    key={document._id}
                  >
                    <FileText size={17} />
                    <span>
                      {document.title}
                      <small>{document.fileType}</small>
                    </span>
                    <StatusBadge value={document.status} />
                  </a>
                ))
              )}
            </div>
          </div>

          {selectedData.canDecide ? (
            <form
              className="form"
              onSubmit={(event) => {
                event.preventDefault()
                mutation.mutate()
              }}
            >
              <label>
                Decision
                <select
                  className="input"
                  value={decision}
                  onChange={(event) =>
                    setDecision(event.target.value as TeacherDecision)
                  }
                >
                  <option value="approved">Approve teacher</option>
                  <option value="rejected">Reject / request changes</option>
                </select>
              </label>

              {decision === 'rejected' && (
                <label>
                  Required reason
                  <textarea
                    className="input admin-textarea"
                    required
                    minLength={3}
                    maxLength={500}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Explain exactly what the teacher must correct."
                  />
                </label>
              )}

              {mutation.isError && (
                <div className="alert error">{getApiError(mutation.error)}</div>
              )}

              <div className="button-row">
                <Button
                  type="button"
                  className="button-secondary"
                  onClick={() => setSelected(null)}
                >
                  Close
                </Button>
                <Button disabled={mutation.isPending}>
                  {mutation.isPending
                    ? 'Saving…'
                    : decision === 'approved'
                      ? 'Approve teacher'
                      : 'Send decision'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="button-row admin-modal-footer-only">
              <Button
                type="button"
                className="button-secondary"
                onClick={() => setSelected(null)}
              >
                Close
              </Button>
            </div>
          )}
        </AdminModal>
      )}
    </div>
  )
}
