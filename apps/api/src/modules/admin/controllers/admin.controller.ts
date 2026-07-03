import type { Request, Response } from 'express'
import { adminService, type AdminContext } from '../services/admin.service.js'

function context(req: Request): AdminContext {
  return {
    adminId: req.user!.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
  }
}

export async function dashboard(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.dashboard() })
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.listUsers(req.query as never) })
}

export async function userDetails(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.userDetails(String(req.params.id)) })
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.updateUser(String(req.params.id), req.body, context(req)) })
}

export async function listTeachers(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.listTeachers(req.query as never) })
}

export async function pendingTeachers(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.pendingTeachers() })
}

export async function decideTeacher(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: await adminService.decideTeacher(
      String(req.params.id),
      req.body.decision,
      req.body.reason,
      context(req),
    ),
  })
}

export async function listBookings(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.listBookings(req.query as never) })
}

export async function updateBooking(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.updateBooking(String(req.params.id), req.body, context(req)) })
}

export async function listFees(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.listFees(req.query as never) })
}

export async function updateFee(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.updateFee(String(req.params.id), req.body, context(req)) })
}

export async function analytics(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.analytics(String(req.query.range) as '7d' | '30d' | '90d' | '12m') })
}

export async function report(req: Request, res: Response): Promise<void> {
  const result = await adminService.report(req.query as never)
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="edvixa-${result.type}-${Date.now()}.csv"`)
    res.send(result.csv)
    return
  }
  res.json({ success: true, data: { ...result, csv: undefined } })
}

export async function listSubjects(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.listSubjects() })
}

export async function listAnnouncements(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.listAnnouncements(req.query as never) })
}

export async function createAnnouncement(req: Request, res: Response): Promise<void> {
  res.status(201).json({ success: true, data: await adminService.createAnnouncement(req.body, context(req)) })
}

export async function updateAnnouncement(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.updateAnnouncement(String(req.params.id), req.body, context(req)) })
}

export async function getSettings(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.getSettings() })
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.updateSettings(req.body, context(req)) })
}

export async function roles(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: adminService.roles() })
}

export async function security(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.securityOverview() })
}

export async function auditLogs(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.listAuditLogs(req.query as never) })
}

export async function supportTickets(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.listSupportTickets(req.query as never) })
}

export async function updateSupportTicket(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await adminService.updateSupportTicket(String(req.params.id), req.body, context(req)) })
}
