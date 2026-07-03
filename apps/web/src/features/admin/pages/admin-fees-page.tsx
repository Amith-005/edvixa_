import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  BadgeIndianRupee,
  CircleCheckBig,
  RotateCcw,
  Search,
  WalletCards,
} from 'lucide-react'
import { useState } from 'react'

import { Button, Card, Input, StatCard } from '../../../components/ui'
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
import type { AdminFee, Paginated } from '../types'

type FeeResult = Paginated<AdminFee> & {
  totals: {
    paid: number
    pending: number
    refunded: number
    teacherOwed: number
  }
}

type FeeAction = 'request-refund' | 'approve-payout' | 'mark-payout-paid'

const actionTitle: Record<FeeAction, string> = {
  'request-refund': 'Request refund',
  'approve-payout': 'Approve teacher payout',
  'mark-payout-paid': 'Mark payout as paid',
}

export default function AdminFeesPage() {
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [payoutStatus, setPayoutStatus] = useState('all')
  const [selected, setSelected] = useState<AdminFee | null>(null)
  const [action, setAction] = useState<FeeAction>('request-refund')
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState('')

  const query = useQuery({
    queryKey: ['admin', 'fees', { page, search, status, payoutStatus }],
    queryFn: () =>
      getAdminData<FeeResult>('/admin/fees', {
        page,
        limit: 20,
        search: search || undefined,
        status,
        payoutStatus,
      }),
  })

  const mutation = useMutation({
    mutationFn: () =>
      patchAdminData(`/admin/fees/${selected?._id}/action`, {
        action,
        ...(action === 'request-refund' ? { reason: reason.trim() } : {}),
      }),
    onSuccess: async () => {
      setNotice(
        action === 'request-refund'
          ? 'Refund request recorded for gateway processing.'
          : 'Payout status updated.',
      )
      setSelected(null)
      setReason('')
      await Promise.all([
        client.invalidateQueries({ queryKey: ['admin', 'fees'] }),
        client.invalidateQueries({ queryKey: ['admin', 'bookings'] }),
        client.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
        client.invalidateQueries({ queryKey: ['admin', 'analytics'] }),
      ])
    },
  })

  const open = (fee: AdminFee, next: FeeAction) => {
    setSelected(fee)
    setAction(next)
    setReason('')
    setNotice('')
  }

  const conflicts = query.data?.items.filter(
    (fee) => fee.hasFinancialConflict,
  ).length ?? 0

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Fees and payouts"
        subtitle="Trace payment records, platform commission, refunds, and teacher payout approvals."
      />

      {notice && <div className="alert success">{notice}</div>}
      {conflicts > 0 && (
        <div className="alert error admin-inline-alert">
          <AlertTriangle size={18} />
          {conflicts} transaction{conflicts === 1 ? '' : 's'} in this page need
          manual reconciliation because refund and payout states conflict.
        </div>
      )}

      {query.data && (
        <div className="admin-metric-grid admin-metric-grid-four">
          <StatCard
            label="Collected"
            value={formatMoney(query.data.totals.paid)}
            icon={<BadgeIndianRupee />}
          />
          <StatCard
            label="Pending payments"
            value={formatMoney(query.data.totals.pending)}
            icon={<WalletCards />}
          />
          <StatCard
            label="Refunded"
            value={formatMoney(query.data.totals.refunded)}
            icon={<RotateCcw />}
          />
          <StatCard
            label="Eligible teacher payouts"
            value={formatMoney(query.data.totals.teacherOwed)}
            icon={<CircleCheckBig />}
          />
        </div>
      )}

      <Card className="admin-filter-card">
        <form
          className="admin-filter-grid"
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
              placeholder="User, order ID, or payment ID"
            />
          </label>
          <label>
            Payment status
            <select
              className="input"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">All payments</option>
              {['pending', 'paid', 'failed', 'refunded'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Payout
            <select
              className="input"
              value={payoutStatus}
              onChange={(event) => {
                setPayoutStatus(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">All payouts</option>
              {['pending', 'approved', 'paid', 'failed'].map((value) => (
                <option key={value}>{value}</option>
              ))}
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
        <AdminError
          message={getApiError(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : !query.data || query.data.items.length === 0 ? (
        <AdminEmpty
          title="No fee records"
          message="No transactions match the selected filters."
        />
      ) : (
        <Card>
          <AdminTable
            headers={[
              'Transaction',
              'People',
              'Amounts',
              'Payment',
              'Refund',
              'Payout',
              'Actions',
            ]}
          >
            {query.data.items.map((fee) => (
              <tr key={fee._id}>
                <td>
                  <strong>{fee.bookingId?.topicName ?? 'Booking'}</strong>
                  <small>
                    {fee.gatewayPaymentId ?? fee.gatewayOrderId ?? fee._id}
                  </small>
                  <small>{formatDate(fee.createdAt, true)}</small>
                </td>
                <td>
                  <strong>{fee.studentId?.name ?? 'Student'}</strong>
                  <small>Teacher: {fee.teacherId?.name ?? 'Unknown'}</small>
                </td>
                <td>
                  <strong>{formatMoney(fee.totalAmount)}</strong>
                  <small>Commission {formatMoney(fee.platformCommission)}</small>
                  <small>Teacher {formatMoney(fee.teacherEarning)}</small>
                </td>
                <td>
                  <StatusBadge value={fee.status} />
                </td>
                <td>
                  <StatusBadge value={fee.refundStatus} />
                </td>
                <td>
                  <StatusBadge value={fee.payoutStatus} />
                  <small>
                    Booking: {fee.bookingId?.status?.replaceAll('_', ' ') ?? 'unknown'}
                  </small>
                  {fee.hasFinancialConflict && (
                    <small className="admin-danger-text">Needs reconciliation</small>
                  )}
                </td>
                <td>
                  <div className="admin-row-actions">
                    {fee.refundEligible && (
                      <Button
                        className="button-secondary"
                        onClick={() => open(fee, 'request-refund')}
                      >
                        <RotateCcw size={16} />
                        Refund
                      </Button>
                    )}
                    {fee.payoutEligible && (
                      <Button onClick={() => open(fee, 'approve-payout')}>
                        Approve payout
                      </Button>
                    )}
                    {fee.canMarkPayoutPaid && (
                      <Button onClick={() => open(fee, 'mark-payout-paid')}>
                        Mark paid
                      </Button>
                    )}
                    {!fee.hasFinancialConflict &&
                      !fee.refundEligible &&
                      !fee.payoutEligible &&
                      !fee.canMarkPayoutPaid &&
                      fee.payoutBlockedReason && (
                        <small className="admin-action-note">
                          {fee.payoutBlockedReason}
                        </small>
                      )}
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
          <AdminPagination
            pagination={query.data.pagination}
            onPage={setPage}
          />
        </Card>
      )}

      {selected && (
        <AdminModal
          title={actionTitle[action]}
          onClose={() => setSelected(null)}
        >
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault()
              mutation.mutate()
            }}
          >
            <p className="muted">
              Transaction total:{' '}
              <strong>{formatMoney(selected.totalAmount)}</strong>. Payment-provider
              settlement must be reconciled separately where applicable.
            </p>
            {action === 'request-refund' && (
              <label>
                Refund reason
                <textarea
                  className="input admin-textarea"
                  required
                  minLength={3}
                  maxLength={500}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
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
                Cancel
              </Button>
              <Button disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Confirm action'}
              </Button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  )
}
