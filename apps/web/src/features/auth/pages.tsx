import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { ArrowRight, CheckCircle2, GraduationCap, MailCheck, RefreshCw, UserRoundCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button, Card, Input } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'

const apiError = (error: unknown, fallback: string) =>
  axios.isAxiosError(error) ? error.response?.data?.error?.message ?? fallback : fallback

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })
type Login = z.infer<typeof loginSchema>

export function LoginPage() {
  const user = useAuthStore((state) => state.user)
  const setSession = useAuthStore((state) => state.setSession)
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Login>({ resolver: zodResolver(loginSchema) })

  if (user) return <Navigate to={`/${user.role}/dashboard`} replace/>

  const submit = handleSubmit(async (values) => {
    try {
      setError('')
      const response = await api.post('/auth/login', values)
      setSession(response.data.data.accessToken, response.data.data.user)
      navigate((location.state as { from?: string } | null)?.from ?? `/${response.data.data.user.role}/dashboard`)
    } catch (caught) {
      setError(apiError(caught, 'Login failed'))
    }
  })

  return <AuthShell title="Welcome back" subtitle="Continue your learning journey">
    <form onSubmit={submit} className="form">
      <label>Email<Input type="email" autoComplete="email" placeholder="you@example.com" {...register('email')}/>{errors.email && <small className="field-error">{errors.email.message}</small>}</label>
      <label>Password<Input type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')}/>{errors.password && <small className="field-error">{errors.password.message}</small>}</label>
      {error && <div className="alert error">{error}</div>}
      <Button disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Login'} <ArrowRight size={18}/></Button>
      <div className="form-links"><Link to="/forgot-password">Forgot password?</Link><Link to="/register">Create account</Link></div>
    </form>
  </AuthShell>
}

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, 'Add an uppercase letter').regex(/[a-z]/, 'Add a lowercase letter').regex(/[0-9]/, 'Add a number'),
  role: z.enum(['student', 'teacher']),
  gradeLevel: z.string().optional(),
  qualification: z.string().optional(),
  experienceYears: z.number().min(0).optional(),
  hourlyRate: z.number().min(0).optional(),
})
type Register = z.infer<typeof registerSchema>

export function RegisterPage() {
  const setSession = useAuthStore((state) => state.setSession)
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const { register, watch, handleSubmit, formState: { errors, isSubmitting } } = useForm<Register>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'student', experienceYears: 0, hourlyRate: 0 },
  })
  const role = watch('role')
  const submit = handleSubmit(async (values) => {
    try {
      setError('')
      const body = {
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        gradeLevel: values.gradeLevel,
        preferredSubjects: [],
        teacher: values.role === 'teacher' ? {
          bio: '', qualification: values.qualification ?? '', experienceYears: values.experienceYears ?? 0,
          hourlyRate: values.hourlyRate ?? 0, timezone: 'Asia/Kolkata', subjects: [],
        } : undefined,
      }
      const response = await api.post('/auth/register', body)
      setSession(response.data.data.accessToken, response.data.data.user)
      navigate(`/${values.role}/dashboard`)
    } catch (caught) {
      setError(apiError(caught, 'Registration failed'))
    }
  })

  return <AuthShell title="Create your account" subtitle="Choose your role and get started">
    <form onSubmit={submit} className="form">
      <div className="role-tabs"><label className={role === 'student' ? 'role-card selected' : 'role-card'}><input type="radio" value="student" {...register('role')}/><GraduationCap/>Student</label><label className={role === 'teacher' ? 'role-card selected' : 'role-card'}><input type="radio" value="teacher" {...register('role')}/><UserRoundCheck/>Teacher</label></div>
      <label>Full name<Input autoComplete="name" {...register('name')}/>{errors.name && <small className="field-error">{errors.name.message}</small>}</label>
      <label>Email<Input type="email" autoComplete="email" {...register('email')}/>{errors.email && <small className="field-error">{errors.email.message}</small>}</label>
      <label>Password<Input type="password" autoComplete="new-password" {...register('password')}/>{errors.password ? <small className="field-error">{errors.password.message}</small> : <small className="muted">8+ characters with uppercase, lowercase and number</small>}</label>
      {role === 'student' ? <label>Grade/Class<Input placeholder="Example: 10" {...register('gradeLevel')}/></label> : <><label>Qualification<Input {...register('qualification')}/></label><div className="form-grid"><label>Experience<Input type="number" {...register('experienceYears', { valueAsNumber: true })}/></label><label>Hourly rate ₹<Input type="number" {...register('hourlyRate', { valueAsNumber: true })}/></label></div></>}
      {error && <div className="alert error">{error}</div>}
      <Button disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Register'} <ArrowRight size={18}/></Button>
      <p className="center muted">Already registered? <Link to="/login">Login</Link></p>
    </form>
  </AuthShell>
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError('')
    try { await api.post('/auth/forgot-password', { email }); setSent(true) }
    catch (caught) { setError(apiError(caught, 'Could not submit the reset request')) }
    finally { setSubmitting(false) }
  }
  return <AuthShell title="Forgot password" subtitle="We will send a six-digit reset OTP"><form onSubmit={submit} className="form">{sent ? <div className="success-panel"><CheckCircle2/><h3>Check your email</h3><p className="muted">If an account exists, a reset code has been sent.</p><Link to={`/reset-password?email=${encodeURIComponent(email)}`}>Enter OTP</Link></div> : <><label>Email<Input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)}/></label>{error && <div className="alert error">{error}</div>}<Button disabled={submitting}>{submitting ? 'Sending…' : 'Send OTP'}</Button></>}<Link to="/login">Back to login</Link></form></AuthShell>
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [otp, setOtp] = useState('')
  const [newPassword, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError('')
    try { await api.post('/auth/reset-password', { email, otp, newPassword }); setDone(true) }
    catch (caught) { setError(apiError(caught, 'Could not reset the password')) }
    finally { setSubmitting(false) }
  }
  return <AuthShell title="Reset password" subtitle="Use the OTP sent to your email">{done ? <div className="success-panel"><CheckCircle2/><h3>Password updated</h3><Link to="/login">Go to login</Link></div> : <form onSubmit={submit} className="form"><label>Email<Input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)}/></label><label>OTP<Input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}/></label><label>New password<Input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setPassword(event.target.value)}/><small className="muted">Use uppercase, lowercase, and a number.</small></label>{error && <div className="alert error">{error}</div>}<Button disabled={submitting}>{submitting ? 'Updating…' : 'Reset password'}</Button></form>}</AuthShell>
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [email, setEmail] = useState('')
  const [resendStatus, setResendStatus] = useState('')
  const [resending, setResending] = useState(false)
  const verification = useQuery({
    queryKey: ['verify-email', token], enabled: token.length >= 20, retry: false,
    queryFn: async () => { await api.post('/auth/verify-email', { token }); return true },
  })
  const resend = async (event: React.FormEvent) => {
    event.preventDefault(); setResending(true); setResendStatus('')
    try { await api.post('/auth/resend-verification', { email }); setResendStatus('If verification is required, a new link has been sent.') }
    catch (caught) { setResendStatus(apiError(caught, 'Could not request another verification email')) }
    finally { setResending(false) }
  }

  return <AuthShell title="Verify your email" subtitle="Confirm your address to secure your Edvixa account">
    {token ? verification.isLoading ? <div className="success-panel"><RefreshCw className="spin"/><h3>Verifying…</h3></div> : verification.isSuccess ? <div className="success-panel"><MailCheck/><h3>Email verified</h3><p className="muted">Your account email is now confirmed.</p><Link to="/login">Continue to login</Link></div> : <div className="success-panel"><MailCheck/><h3>Link unavailable</h3><p className="muted">This link is invalid, expired, or was already used. Request a new one below.</p></div> : <div className="success-panel"><MailCheck/><h3>Open your verification link</h3><p className="muted">Use the link sent to your registered email, or request another one below.</p></div>}
    {!verification.isSuccess && <form className="form" onSubmit={resend}><label>Email<Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)}/></label>{resendStatus && <div className="alert success">{resendStatus}</div>}<Button disabled={resending}>{resending ? 'Sending…' : 'Resend verification link'}</Button><Link to="/login">Back to login</Link></form>}
  </AuthShell>
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <div className="auth-page"><div className="auth-visual"><div className="brand large"><span className="brand-mark">E</span><span>Edvixa</span></div><h1>Learn smarter.<br/>Grow faster.</h1><p>AI-powered practice, progress tracking, and expert teacher sessions in one platform.</p><div className="orb orb-one"/><div className="orb orb-two"/></div><Card className="auth-card"><h2>{title}</h2><p className="muted">{subtitle}</p>{children}</Card></div>
}
