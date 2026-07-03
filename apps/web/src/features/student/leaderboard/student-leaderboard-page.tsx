import { useQuery } from '@tanstack/react-query'
import { Flame, Medal, Trophy, UsersRound } from 'lucide-react'
import { Card, StatCard } from '../../../components/ui'
import { api } from '../../../lib/api'

type Entry={rank:number;userId:string;name:string;avatar?:string|null;gradeLevel?:string|null;level:number;xp:number;streak:number;practiceSessions:number;averageScore:number;isCurrentUser:boolean}
type Leaderboard={entries:Entry[];currentRank:number|null;totalStudents:number}
export function StudentLeaderboardPage(){
  const query=useQuery({queryKey:['student','leaderboard'],queryFn:async()=>{const response=await api.get<{success:true;data:Leaderboard}>('/students/leaderboard');return response.data.data}})
  return <div className="student-leaderboard-page"><div className="page-header"><div><span className="eyebrow">Community progress</span><h1>Student leaderboard</h1><p className="muted">Ranks use XP first, then streak and completed practice sessions.</p></div></div>
    {query.isLoading?<div className="skeleton student-leaderboard-skeleton"/>:query.isError||!query.data?<Card className="student-empty-state"><p>Could not load the leaderboard. Please try again.</p></Card>:<><div className="stat-grid"><StatCard label="Your rank" value={query.data.currentRank?`#${query.data.currentRank}`:'—'} icon={<Trophy/>}/><StatCard label="Students ranked" value={query.data.totalStudents} icon={<UsersRound/>}/><StatCard label="Top XP" value={query.data.entries[0]?.xp??0} icon={<Medal/>}/></div><Card><div className="student-leaderboard-list">{query.data.entries.map(entry=><div className={`student-leaderboard-row ${entry.isCurrentUser?'current':''}`} key={entry.userId}><div className={`student-rank rank-${Math.min(entry.rank,4)}`}>{entry.rank<=3?<Medal size={20}/>:entry.rank}</div><div className="student-leaderboard-avatar">{entry.avatar?<img src={entry.avatar} alt=""/>:entry.name.charAt(0).toUpperCase()}</div><div className="student-leaderboard-name"><strong>{entry.name}{entry.isCurrentUser?' (You)':''}</strong><span>{entry.gradeLevel??'Grade not set'} · Level {entry.level}</span></div><div><strong>{entry.xp.toLocaleString('en-IN')} XP</strong><span><Flame size={13}/>{entry.streak} day streak</span></div><div><strong>{entry.averageScore}%</strong><span>{entry.practiceSessions} practices</span></div></div>)}</div></Card></>}
  </div>
}
