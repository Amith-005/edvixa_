declare global {
  namespace Express {
    interface Request {
      requestId?: string
      validated?: { body?: unknown; params?: unknown; query?: unknown }
      user?: {
        id: string
        email: string
        role: 'student' | 'teacher' | 'admin'
      }
    }
  }
}

export {}
