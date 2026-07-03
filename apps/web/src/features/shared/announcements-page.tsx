import { useQuery } from '@tanstack/react-query'
import { BellRing, CircleAlert, Info, Megaphone, Sparkles } from 'lucide-react'
import { Card } from '../../components/ui'
import { api } from '../../lib/api'

type Announcement={_id:string;title:string;message:string;audience:string;severity:'info'|'success'|'warning'|'critical';publishAt?:string|null;expiresAt?:string|null;createdAt:string}
const icons={info:Info,success:Sparkles,warning:CircleAlert,critical:CircleAlert}
export function AnnouncementsPage(){
  const query=useQuery({queryKey:['announcements'],queryFn:async()=>{const response=await api.get<{success:true;data:Announcement[]}>('/users/announcements');return response.data.data}})
  return <div className="platform-announcements-page"><div className="page-header"><div><span className="eyebrow">Platform updates</span><h1>Announcements</h1><p className="muted">Official Edvixa notices relevant to your account.</p></div><BellRing/></div>{query.isLoading?<div className="skeleton announcements-skeleton"/>:query.isError?<Card className="student-empty-state"><p>Could not load announcements.</p></Card>:query.data?.length===0?<Card className="student-empty-state"><Megaphone/><p>There are no active announcements right now.</p></Card>:<div className="platform-announcement-list">{query.data?.map(item=>{const Icon=icons[item.severity];return <Card className={`platform-announcement severity-${item.severity}`} key={item._id}><div className="platform-announcement-icon"><Icon/></div><div><div className="platform-announcement-meta"><span className={`badge badge-${item.severity==='critical'?'danger':item.severity==='warning'?'warning':item.severity==='success'?'success':'purple'}`}>{item.severity}</span><span>{new Intl.DateTimeFormat('en-IN',{dateStyle:'medium'}).format(new Date(item.publishAt??item.createdAt))}</span></div><h3>{item.title}</h3><p>{item.message}</p></div></Card>})}</div>}
  </div>
}
