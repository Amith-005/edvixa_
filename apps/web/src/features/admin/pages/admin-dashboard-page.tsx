import { useQuery } from '@tanstack/react-query'
import { Activity, CalendarCheck, CircleDollarSign, GraduationCap, Headphones, IndianRupee, ShieldCheck, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, StatCard } from '../../../components/ui'
import { getAdminData, formatDate, formatMoney } from '../api'
import { AdminError, AdminLoading, AdminPageHeader, AdminTable, StatusBadge } from '../components'
import type { AdminDashboard } from '../types'

export default function AdminDashboardPage() {
  const query = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => getAdminData<AdminDashboard>('/admin/dashboard') })
  if (query.isLoading) return <><AdminPageHeader title="Command centre" subtitle="Live platform health, growth, revenue, and moderation workload."/><AdminLoading rows={6}/></>
  if (query.isError || !query.data) return <><AdminPageHeader title="Command centre" subtitle="Live platform health, growth, revenue, and moderation workload."/><AdminError onRetry={() => query.refetch()}/></>
  const data = query.data
  const maxTrend = Math.max(1, ...data.trend.map((item) => Math.max(item.users, item.bookings)))

  return <div className="admin-page">
    <AdminPageHeader title="Command centre" subtitle="Live platform health, growth, revenue, and moderation workload." actions={<Link className="button" to="/admin/teachers"><ShieldCheck size={17}/>Review teachers</Link>}/>
    <div className="admin-metric-grid">
      <StatCard label="Students" value={data.students} icon={<GraduationCap/>} detail={`+${data.newUsersThisMonth} users this month`}/>
      <StatCard label="Teachers" value={data.teachers} icon={<UsersRound/>} detail={`${data.pendingTeachers} awaiting review`}/>
      <StatCard label="Active bookings" value={data.activeBookings} icon={<CalendarCheck/>} detail={`${data.completedSessionsThisMonth} completed this month`}/>
      <StatCard label="Collected revenue" value={formatMoney(data.revenue)} icon={<IndianRupee/>} detail={`${formatMoney(data.pendingPayouts)} pending payouts`}/>
      <StatCard label="Active subjects" value={data.subjects} icon={<Activity/>}/>
      <StatCard label="Open support" value={data.openTickets} icon={<Headphones/>}/>
    </div>

    {data.alerts.length > 0 && <div className="admin-alert-stack">{data.alerts.map((alert, index) => <div className={`admin-alert admin-alert-${alert.tone}`} key={`${alert.message}-${index}`}>{alert.message}</div>)}</div>}

    <div className="admin-dashboard-grid">
      <Card className="admin-chart-card"><div className="row-between"><div><h3>Six-month activity</h3><p className="muted">New users and booking creation</p></div><CircleDollarSign/></div><div className="admin-bar-chart" aria-label="Six month activity chart">{data.trend.map((item) => <div className="admin-bar-group" key={item.label}><div className="admin-bars"><span className="admin-bar users" style={{height:`${Math.max(4,(item.users/maxTrend)*100)}%`}} title={`${item.users} users`}/><span className="admin-bar bookings" style={{height:`${Math.max(4,(item.bookings/maxTrend)*100)}%`}} title={`${item.bookings} bookings`}/></div><strong>{item.label}</strong><small>{formatMoney(item.revenue)}</small></div>)}</div><div className="admin-chart-legend"><span><i className="users"/>New users</span><span><i className="bookings"/>Bookings</span></div></Card>
      <Card><h3>Recent admin activity</h3><div className="admin-activity-list">{data.recentActivity.length === 0 ? <p className="muted">No administrative changes recorded yet.</p> : data.recentActivity.map((entry) => <div className="admin-activity-item" key={entry._id}><span className="admin-activity-dot"/><div><strong>{entry.summary}</strong><p className="muted">{entry.actorId?.name ?? 'Administrator'} · {formatDate(entry.createdAt,true)}</p></div></div>)}</div><Link className="admin-text-link" to="/admin/security">Open security and audit logs →</Link></Card>
    </div>

    <Card><div className="row-between"><div><h3>Newest accounts</h3><p className="muted">Latest users registered on Edvixa</p></div><Link to="/admin/users">View all users →</Link></div><AdminTable headers={['User','Role','Email','Status','Joined']}>
      {data.recentUsers.map((user) => <tr key={user._id}><td><Link to={`/admin/users/${user._id}`}><strong>{user.name}</strong></Link></td><td><StatusBadge value={user.role}/></td><td>{user.email}</td><td><StatusBadge value={user.isActive ? (user.isEmailVerified ? 'active' : 'unverified') : 'inactive'}/></td><td>{formatDate(user.createdAt)}</td></tr>)}
    </AdminTable></Card>
  </div>
}
