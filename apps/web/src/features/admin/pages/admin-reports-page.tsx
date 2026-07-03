import { useMutation } from '@tanstack/react-query'
import { Download, FileJson, FileSpreadsheet, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Input } from '../../../components/ui'
import { api } from '../../../lib/api'
import { formatDate, getAdminData, getApiError } from '../api'
import { AdminPageHeader, AdminTable } from '../components'

type Report={type:string;generatedAt:string;count:number;rows:Array<Record<string,unknown>>}
export default function AdminReportsPage(){
  const [type,setType]=useState<'overview'|'users'|'bookings'|'revenue'>('overview'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[result,setResult]=useState<Report|null>(null)
  const preview=useMutation({mutationFn:()=>getAdminData<Report>('/admin/reports',{type,format:'json',from:from||undefined,to:to?`${to}T23:59:59.999Z`:undefined}),onSuccess:setResult})
  const download=useMutation({mutationFn:async()=>{const response=await api.get('/admin/reports',{params:{type,format:'csv',from:from||undefined,to:to?`${to}T23:59:59.999Z`:undefined},responseType:'blob'});const url=URL.createObjectURL(response.data);const link=document.createElement('a');link.href=url;link.download=`edvixa-${type}-${new Date().toISOString().slice(0,10)}.csv`;document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url)}})
  const columns=result?.rows[0]?Object.keys(result.rows[0]):[]
  return <div className="admin-page"><AdminPageHeader title="Reports and data exports" subtitle="Generate bounded operational exports for review, finance, and platform administration."/>
    <Card><div className="admin-report-controls"><label>Report type<select className="input" value={type} onChange={(event)=>{setType(event.target.value as typeof type);setResult(null)}}><option value="overview">Platform overview</option><option value="users">Users</option><option value="bookings">Bookings</option><option value="revenue">Revenue</option></select></label><label>From<Input type="date" value={from} onChange={(event)=>setFrom(event.target.value)}/></label><label>To<Input type="date" value={to} onChange={(event)=>setTo(event.target.value)}/></label><Button onClick={()=>preview.mutate()} disabled={preview.isPending}><FileJson size={16}/>{preview.isPending?'Generating…':'Preview JSON'}</Button><Button className="button-secondary" onClick={()=>download.mutate()} disabled={download.isPending}><Download size={16}/>{download.isPending?'Preparing…':'Download CSV'}</Button></div>{(preview.isError||download.isError)&&<div className="alert error">{getApiError(preview.error??download.error)}</div>}<div className="admin-export-note"><ShieldCheck size={20}/><p><strong>Export guardrails:</strong> reports are limited to 5,000 records per request. CSV values are escaped server-side, and all report endpoints require an authenticated administrator.</p></div></Card>
    {result&&<Card><div className="row-between"><div><h3>{result.type.replace(/^./,value=>value.toUpperCase())} report</h3><p className="muted">Generated {formatDate(result.generatedAt,true)} · {result.count} rows</p></div><FileSpreadsheet/></div>{result.rows.length===0?<p className="muted">No data exists for this date range.</p>:<AdminTable headers={columns}>{result.rows.slice(0,25).map((row,index)=><tr key={index}>{columns.map(column=><td key={column}>{renderValue(row[column])}</td>)}</tr>)}</AdminTable>}{result.count>25&&<p className="muted admin-result-summary">Preview shows the first 25 rows. Download CSV for the complete export.</p>}</Card>}
  </div>
}
function renderValue(value:unknown){if(value===null||value===undefined||value==='')return '—';if(typeof value==='boolean')return value?'Yes':'No';return String(value)}
