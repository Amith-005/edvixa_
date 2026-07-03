import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge, Button, Card } from '../../components/ui'
import type { Pagination } from './types'

export function AdminPageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return <div className="page-header admin-page-header"><div><p className="eyebrow">Administration</p><h1>{title}</h1><p className="muted">{subtitle}</p></div>{actions && <div className="admin-header-actions">{actions}</div>}</div>
}

export function AdminLoading({ rows = 4 }: { rows?: number }) {
  return <div className="admin-loading-grid">{Array.from({ length: rows }, (_, index) => <div className="skeleton admin-row-skeleton" key={index} />)}</div>
}

export function AdminError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return <Card className="admin-state-card"><AlertTriangle size={34}/><h3>Could not load this section</h3><p className="muted">{message ?? 'Please check the API connection and try again.'}</p>{onRetry && <Button onClick={onRetry}><RefreshCw size={16}/>Retry</Button>}</Card>
}

export function AdminEmpty({ title, message }: { title: string; message: string }) {
  return <Card className="admin-state-card"><Inbox size={34}/><h3>{title}</h3><p className="muted">{message}</p></Card>
}

export function AdminPagination({ pagination, onPage }: { pagination: Pagination; onPage: (page: number) => void }) {
  if (pagination.pages <= 1) return null
  return <div className="admin-pagination"><Button className="button-secondary" disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}><ChevronLeft size={16}/>Previous</Button><span>Page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong> · {pagination.total} records</span><Button className="button-secondary" disabled={pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)}>Next<ChevronRight size={16}/></Button></div>
}

export function StatusBadge({ value }: { value: string | boolean | null | undefined }) {
  const text = typeof value === 'boolean' ? (value ? 'Active' : 'Inactive') : String(value ?? 'unknown')
  const normalized = text.toLowerCase()
  const tone = ['active','approved','paid','published','completed','resolved','success','verified'].some((word) => normalized.includes(word))
    ? 'success'
    : ['pending','warning','in_progress','upcoming','draft','requested'].some((word) => normalized.includes(word))
      ? 'warning'
      : ['failed','rejected','banned','inactive','cancelled','critical','closed'].some((word) => normalized.includes(word))
        ? 'danger'
        : 'neutral'
  return <Badge tone={tone}>{text.replaceAll('_', ' ')}</Badge>
}

export function AdminTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}

export function AdminModal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={onClose}><section className="card admin-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><div className="row-between"><h2>{title}</h2><button className="admin-close-button" type="button" onClick={onClose} aria-label="Close">×</button></div>{children}</section></div>
}
