import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarX2, CheckCircle2, Search } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Input } from '../../../components/ui'
import { formatDate, formatMoney, getAdminData, getApiError, patchAdminData } from '../api'
import { AdminEmpty, AdminError, AdminLoading, AdminModal, AdminPageHeader, AdminPagination, AdminTable, StatusBadge } from '../components'
import type { AdminBooking, Paginated } from '../types'

type BookingAction = 'cancel' | 'mark-completed'

export default function AdminBookingsPage() {
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<AdminBooking | null>(null)
  const [action, setAction] = useState<BookingAction>('cancel')
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState('')

  const query = useQuery({
    queryKey: ['admin', 'bookings', { page, search, status, paymentStatus, from, to }],
    queryFn: () => getAdminData<Paginated<AdminBooking>>('/admin/bookings', {
      page, limit: 20, search: search || undefined, status, paymentStatus,
      from: from || undefined, to: to ? `${to}T23:59:59.999Z` : undefined,
    }),
  })
  const mutation = useMutation({
    mutationFn: () => patchAdminData(`/admin/bookings/${selected?._id}/action`, { action, ...(reason.trim() ? { reason: reason.trim() } : {}) }),
    onSuccess: async () => {
      setNotice(action === 'cancel' ? 'Booking cancelled and the slot was released.' : 'Booking marked as completed.')
      setSelected(null); setReason('')
      await client.invalidateQueries({ queryKey: ['admin', 'bookings'] })
    },
  })
  const open = (booking: AdminBooking, next: BookingAction) => { setSelected(booking); setAction(next); setReason(''); setNotice('') }

  return <div className="admin-page">
    <AdminPageHeader title="Booking operations" subtitle="Review every platform booking, payment state, schedule, and administrative intervention."/>
    {notice && <div className="alert success">{notice}</div>}
    <Card className="admin-filter-card"><form className="admin-filter-grid admin-filter-grid-wide" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchDraft.trim()) }}>
      <label>Search<Input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Student, teacher, topic, or meeting ID"/></label>
      <label>Booking status<select className="input" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="all">All statuses</option>{['pending','accepted','rejected','upcoming','completed','cancelled','rescheduled'].map((value) => <option value={value} key={value}>{value.replaceAll('_',' ')}</option>)}</select></label>
      <label>Payment<select className="input" value={paymentStatus} onChange={(event) => { setPaymentStatus(event.target.value); setPage(1) }}><option value="all">All payments</option>{['pending','paid','failed','refunded'].map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
      <label>From<Input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1) }}/></label>
      <label>To<Input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1) }}/></label>
      <Button><Search size={16}/>Apply</Button>
    </form></Card>
    {query.isLoading ? <AdminLoading/> : query.isError ? <AdminError message={getApiError(query.error)} onRetry={() => query.refetch()}/> : !query.data || query.data.items.length === 0 ? <AdminEmpty title="No matching bookings" message="There are no bookings for these filters."/> : <Card><AdminTable headers={['Session','Participants','Schedule','Amount','Booking','Payment','Actions']}>
      {query.data.items.map((booking) => <tr key={booking._id}><td><strong>{booking.topicName}</strong><small>{booking.subjectId?.name ?? 'Subject unavailable'}</small></td><td><strong>{booking.studentId?.name ?? 'Student'}</strong><small>with {booking.teacherId?.name ?? 'Teacher'}</small></td><td>{formatDate(booking.scheduledAt, true)}<small>{booking.timezone}</small></td><td>{formatMoney(booking.totalAmount)}</td><td><StatusBadge value={booking.status}/></td><td><StatusBadge value={booking.paymentStatus}/></td><td><div className="admin-row-actions">{!['completed','cancelled'].includes(booking.status) && <Button className="button-danger" onClick={() => open(booking,'cancel')}><CalendarX2 size={16}/>Cancel</Button>}{booking.paymentStatus === 'paid' && booking.status !== 'completed' && booking.status !== 'cancelled' && <Button onClick={() => open(booking,'mark-completed')}><CheckCircle2 size={16}/>Complete</Button>}</div></td></tr>)}
    </AdminTable><AdminPagination pagination={query.data.pagination} onPage={setPage}/></Card>}
    {selected && <AdminModal title={action === 'cancel' ? `Cancel ${selected.topicName}` : `Complete ${selected.topicName}`} onClose={() => setSelected(null)}><form className="form" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}><p className="muted">{formatDate(selected.scheduledAt,true)} · {selected.studentId?.name} with {selected.teacherId?.name}</p><label>{action === 'cancel' ? 'Cancellation reason' : 'Administrative note (optional)'}<textarea className="input admin-textarea" required={action === 'cancel'} minLength={action === 'cancel' ? 3 : undefined} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)}/></label>{mutation.isError && <div className="alert error">{getApiError(mutation.error)}</div>}<div className="button-row"><Button type="button" className="button-secondary" onClick={() => setSelected(null)}>Keep booking</Button><Button className={action === 'cancel' ? 'button-danger' : ''} disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Confirm'}</Button></div></form></AdminModal>}
  </div>
}
