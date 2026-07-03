import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  BookOpen,
  Camera,
  CheckCircle2,
  Flame,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  Mail,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, Input, StatCard } from '../../../components/ui'
import { api } from '../../../lib/api'
import { useAuthStore } from '../../../stores/auth.store'
import type {
  ProfileTopic,
  StudentProfileData,
  StudentProfileDraft,
} from './types'

const MAX_AVATAR_BYTES = 450 * 1024

export function StudentProfilePage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const accessToken = useAuthStore((state) => state.accessToken)
  const authUser = useAuthStore((state) => state.user)
  const setSession = useAuthStore((state) => state.setSession)
  const clearSession = useAuthStore((state) => state.clearSession)

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<StudentProfileDraft | null>(null)
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const profileQuery = useQuery<StudentProfileData>({
    queryKey: ['student-profile'],
    queryFn: () =>
      api.get('/students/profile').then((response) => response.data.data),
  })

  useEffect(() => {
    if (profileQuery.data && !draft) {
      setDraft(toDraft(profileQuery.data))
    }
  }, [draft, profileQuery.data])

  const saveMutation = useMutation({
    mutationFn: (payload: {
      name: string
      phone: string | null
      avatar: string | null
      gradeLevel: string | null
      learningGoal: string | null
      preferredSubjects: string[]
    }) =>
      api
        .patch('/students/profile', payload)
        .then((response) => response.data.data as StudentProfileData),
    onSuccess: async (data) => {
      setDraft(toDraft(data))
      setIsEditing(false)
      setNotice({ tone: 'success', message: 'Profile updated successfully.' })

      if (accessToken && authUser) {
        setSession(accessToken, {
          ...authUser,
          name: data.user.name,
          avatar: data.user.avatar,
        })
      }

      queryClient.setQueryData(['student-profile'], data)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['student-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['student-progress'] }),
      ])
    },
    onError: (error) => {
      setNotice({ tone: 'error', message: apiErrorMessage(error) })
    },
  })

  const selectedSubjectNames = useMemo(() => {
    if (!draft || !profileQuery.data) return []
    const selected = new Set(draft.preferredSubjects)
    return profileQuery.data.availableSubjects.filter((subject) =>
      selected.has(subject.id),
    )
  }, [draft, profileQuery.data])

  function startEditing() {
    if (!profileQuery.data) return
    setDraft(toDraft(profileQuery.data))
    setNotice(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    if (profileQuery.data) setDraft(toDraft(profileQuery.data))
    setNotice(null)
    setIsEditing(false)
  }

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return

    const name = draft.name.trim()
    if (name.length < 2) {
      setNotice({
        tone: 'error',
        message: 'Name must contain at least two characters.',
      })
      return
    }

    saveMutation.mutate({
      name,
      phone: nullableText(draft.phone),
      avatar: nullableText(draft.avatar),
      gradeLevel: nullableText(draft.gradeLevel),
      learningGoal: nullableText(draft.learningGoal),
      preferredSubjects: draft.preferredSubjects,
    })
  }

  function toggleSubject(subjectId: string) {
    if (!draft) return
    const next = draft.preferredSubjects.includes(subjectId)
      ? draft.preferredSubjects.filter((id) => id !== subjectId)
      : [...draft.preferredSubjects, subjectId]

    setDraft({ ...draft, preferredSubjects: next })
  }

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !draft) return

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setNotice({
        tone: 'error',
        message: 'Use a PNG, JPEG, or WebP image.',
      })
      return
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setNotice({
        tone: 'error',
        message: 'Avatar must be smaller than 450 KB.',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setDraft((current) =>
        current
          ? { ...current, avatar: typeof reader.result === 'string' ? reader.result : '' }
          : current,
      )
      setNotice(null)
    }
    reader.onerror = () => {
      setNotice({ tone: 'error', message: 'The selected image could not be read.' })
    }
    reader.readAsDataURL(file)
  }

  if (profileQuery.isLoading) return <ProfileSkeleton />

  if (profileQuery.isError || !profileQuery.data || !draft) {
    return (
      <div className="student-profile-page">
        <ProfileHeader />
        <Card>
          <div className="profile-error-state">
            <AlertCircle size={42} />
            <div>
              <h3>We could not load your profile</h3>
              <p className="muted">
                Check that the API and MongoDB are running, then try again.
              </p>
            </div>
            <Button onClick={() => profileQuery.refetch()} type="button">
              Try again
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const data = profileQuery.data

  return (
    <div className="student-profile-page">
      <ProfileHeader
        action={
          isEditing ? (
            <div className="button-row profile-header-actions">
              <Button
                className="button-secondary"
                disabled={saveMutation.isPending}
                onClick={cancelEditing}
                type="button"
              >
                <X size={17} />
                Cancel
              </Button>
              <Button
                disabled={saveMutation.isPending}
                form="student-profile-form"
                type="submit"
              >
                <Save size={17} />
                {saveMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          ) : (
            <Button onClick={startEditing} type="button">
              <Pencil size={17} />
              Edit profile
            </Button>
          )
        }
      />

      {notice ? (
        <div className={`profile-notice ${notice.tone}`} role="status">
          {notice.tone === 'success' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          {notice.message}
        </div>
      ) : null}

      <Card className="profile-hero-card">
        <div className="profile-avatar-column">
          <AvatarPreview
            avatar={draft.avatar || null}
            name={draft.name || data.user.name}
          />
          {isEditing ? (
            <div className="profile-avatar-actions">
              <input
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={chooseAvatar}
                ref={fileInputRef}
                type="file"
              />
              <Button
                className="button-secondary profile-small-button"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Upload size={16} />
                Upload avatar
              </Button>
              {draft.avatar ? (
                <button
                  className="profile-text-button danger"
                  onClick={() => setDraft({ ...draft, avatar: '' })}
                  type="button"
                >
                  Remove photo
                </button>
              ) : null}
              <span className="profile-avatar-help">PNG, JPEG or WebP · max 450 KB</span>
            </div>
          ) : null}
        </div>

        <div className="profile-identity">
          <div className="profile-badge-row">
            <Badge tone="purple">Level {data.profile.level}</Badge>
            <Badge tone={data.user.isEmailVerified ? 'success' : 'warning'}>
              {data.user.isEmailVerified ? 'Email verified' : 'Email unverified'}
            </Badge>
          </div>
          <h2>{data.user.name}</h2>
          <p className="muted">{data.user.email}</p>
          <div className="profile-xp-block">
            <div className="row-between">
              <strong>
                {data.xp.currentLevelXp} / {data.xp.requiredForNextLevel} XP
              </strong>
              <span className="muted">{data.xp.progressPercent}%</span>
            </div>
            <div className="progress">
              <span style={{ width: `${data.xp.progressPercent}%` }} />
            </div>
            <p className="muted">
              {data.xp.remainingXp} XP remaining to reach level{' '}
              {data.profile.level + 1}.
            </p>
          </div>
        </div>

        <div className="profile-hero-summary">
          <div>
            <span>Member since</span>
            <strong>{formatMonthYear(data.user.createdAt)}</strong>
          </div>
          <div>
            <span>Practices completed</span>
            <strong>{data.profile.totalPracticeSessions}</strong>
          </div>
          <div>
            <span>Average score</span>
            <strong>{data.profile.averageScore}%</strong>
          </div>
        </div>
      </Card>

      <div className="stat-grid profile-stat-grid">
        <StatCard
          detail="Current learning level"
          icon={<GraduationCap />}
          label="Level"
          value={data.profile.level}
        />
        <StatCard
          detail="All-time experience"
          icon={<Target />}
          label="Total XP"
          value={data.profile.xp}
        />
        <StatCard
          detail="Keep the momentum going"
          icon={<Flame />}
          label="Day streak"
          value={`${data.profile.streak} days`}
        />
        <StatCard
          detail={`${data.profile.totalPracticeSessions} practice sessions`}
          icon={<BookOpen />}
          label="Accuracy"
          value={`${data.profile.accuracyPercent}%`}
        />
      </div>

      <form id="student-profile-form" onSubmit={submitProfile}>
        <div className="profile-main-grid">
          <Card>
            <SectionHeading
              description="Your account and class information"
              icon={<UserRound size={21} />}
              title="Personal information"
            />

            <div className="profile-form-grid">
              <ProfileField label="Full name">
                {isEditing ? (
                  <Input
                    autoComplete="name"
                    maxLength={80}
                    onChange={(event) =>
                      setDraft({ ...draft, name: event.target.value })
                    }
                    required
                    value={draft.name}
                  />
                ) : (
                  <ReadOnlyValue value={data.user.name} />
                )}
              </ProfileField>

              <ProfileField label="Email address">
                {isEditing ? (
                  <Input disabled value={data.user.email} />
                ) : (
                  <ReadOnlyValue
                    icon={<Mail size={16} />}
                    value={data.user.email}
                  />
                )}
              </ProfileField>

              <ProfileField label="Phone number">
                {isEditing ? (
                  <Input
                    autoComplete="tel"
                    maxLength={30}
                    onChange={(event) =>
                      setDraft({ ...draft, phone: event.target.value })
                    }
                    placeholder="Add a phone number"
                    value={draft.phone}
                  />
                ) : (
                  <ReadOnlyValue
                    icon={<Phone size={16} />}
                    value={data.user.phone || 'Not added'}
                  />
                )}
              </ProfileField>

              <ProfileField label="Grade / class">
                {isEditing ? (
                  <Input
                    maxLength={120}
                    onChange={(event) =>
                      setDraft({ ...draft, gradeLevel: event.target.value })
                    }
                    placeholder="Example: Grade 10 or S5 CS03"
                    value={draft.gradeLevel}
                  />
                ) : (
                  <ReadOnlyValue
                    icon={<GraduationCap size={16} />}
                    value={data.profile.gradeLevel || 'Not added'}
                  />
                )}
              </ProfileField>
            </div>

            <ProfileField label="Learning goal">
              {isEditing ? (
                <textarea
                  className="input profile-textarea"
                  maxLength={300}
                  onChange={(event) =>
                    setDraft({ ...draft, learningGoal: event.target.value })
                  }
                  placeholder="Describe what you want to improve"
                  rows={4}
                  value={draft.learningGoal}
                />
              ) : (
                <ReadOnlyValue
                  value={
                    data.profile.learningGoal ||
                    'Add a learning goal to personalise your experience.'
                  }
                />
              )}
            </ProfileField>
          </Card>

          <Card>
            <SectionHeading
              description="Choose the subjects you want Edvixa to prioritise"
              icon={<BookOpen size={21} />}
              title="Preferred subjects"
            />

            {isEditing ? (
              <div className="profile-subject-selector">
                {data.availableSubjects.map((subject) => {
                  const selected = draft.preferredSubjects.includes(subject.id)
                  return (
                    <label
                      className={`profile-subject-option ${selected ? 'selected' : ''}`}
                      key={subject.id}
                    >
                      <input
                        checked={selected}
                        onChange={() => toggleSubject(subject.id)}
                        type="checkbox"
                      />
                      <span className="profile-subject-check">
                        {selected ? <CheckCircle2 size={17} /> : null}
                      </span>
                      <span>{subject.name}</span>
                    </label>
                  )
                })}
              </div>
            ) : selectedSubjectNames.length > 0 ? (
              <div className="profile-chip-list">
                {selectedSubjectNames.map((subject) => (
                  <span className="profile-topic-chip subject" key={subject.id}>
                    <BookOpen size={15} />
                    {subject.name}
                  </span>
                ))}
              </div>
            ) : (
              <ProfileEmpty text="No preferred subjects selected yet." />
            )}

            <div className="profile-subject-note">
              <Sparkles size={18} />
              <p>
                Preferred subjects help AI practice and recommendations focus on
                the areas most relevant to you.
              </p>
            </div>
          </Card>
        </div>
      </form>

      <div className="profile-main-grid">
        <Card>
          <SectionHeading
            description="Topics where your recent performance is strongest"
            icon={<Target size={21} />}
            title="Strong topics"
          />
          <TopicList
            emptyText="Complete more practices to identify strong topics."
            tone="success"
            topics={data.profile.strongTopics}
          />
        </Card>

        <Card>
          <SectionHeading
            description="Areas that may benefit from focused practice"
            icon={<Sparkles size={21} />}
            title="Topics to improve"
          />
          <TopicList
            emptyText="No weak topic is currently detected."
            tone="danger"
            topics={data.profile.weakTopics}
          />
        </Card>
      </div>

      <Card className="profile-account-card">
        <SectionHeading
          description="Security and account status"
          icon={<ShieldCheck size={21} />}
          title="Account settings"
        />
        <div className="profile-account-grid">
          <div className="profile-account-item">
            <div className="profile-account-icon">
              <Mail size={19} />
            </div>
            <div>
              <strong>Email verification</strong>
              <p className="muted">
                {data.user.isEmailVerified
                  ? 'Your email address is verified.'
                  : 'Verify your email to secure your account.'}
              </p>
            </div>
            <Badge tone={data.user.isEmailVerified ? 'success' : 'warning'}>
              {data.user.isEmailVerified ? 'Verified' : 'Pending'}
            </Badge>
          </div>

          <div className="profile-account-item">
            <div className="profile-account-icon">
              <LockKeyhole size={19} />
            </div>
            <div>
              <strong>Password</strong>
              <p className="muted">
                Use a strong password that you do not reuse elsewhere.
              </p>
            </div>
            <Button
              className="button-secondary"
              onClick={() => setPasswordOpen(true)}
              type="button"
            >
              <KeyRound size={17} />
              Change password
            </Button>
          </div>
        </div>
      </Card>

      {passwordOpen ? (
        <PasswordDialog
          clearSession={clearSession}
          close={() => setPasswordOpen(false)}
          navigateToLogin={() => navigate('/login', { replace: true })}
        />
      ) : null}
    </div>
  )
}

function ProfileHeader({ action }: { action?: React.ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <p className="muted">Student · Profile</p>
        <h1>My profile</h1>
        <p className="muted">
          Manage your personal details and learning preferences.
        </p>
      </div>
      {action}
    </div>
  )
}

function AvatarPreview({ avatar, name }: { avatar: string | null; name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'S'

  return (
    <div className="profile-avatar-preview">
      <span>{initials}</span>
      {avatar ? (
        <img
          alt={`${name} profile`}
          key={avatar}
          onError={(event) => {
            event.currentTarget.hidden = true
          }}
          src={avatar}
        />
      ) : null}
      <div className="profile-avatar-camera">
        <Camera size={16} />
      </div>
    </div>
  )
}

function SectionHeading({
  description,
  icon,
  title,
}: {
  description: string
  icon: React.ReactNode
  title: string
}) {
  return (
    <div className="profile-section-heading">
      <span>{icon}</span>
      <div>
        <h3>{title}</h3>
        <p className="muted">{description}</p>
      </div>
    </div>
  )
}

function ProfileField({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <label className="profile-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function ReadOnlyValue({
  icon,
  value,
}: {
  icon?: React.ReactNode
  value: string
}) {
  return (
    <div className="profile-read-value">
      {icon}
      <span>{value}</span>
    </div>
  )
}

function TopicList({
  emptyText,
  tone,
  topics,
}: {
  emptyText: string
  tone: 'success' | 'danger'
  topics: ProfileTopic[]
}) {
  if (topics.length === 0) return <ProfileEmpty text={emptyText} />

  return (
    <div className="profile-topic-list">
      {topics.map((topic) => (
        <div className="profile-topic-row" key={topic.id}>
          <div>
            <strong>{topic.name}</strong>
            <p className="muted">{topic.attemptCount} attempts</p>
          </div>
          <Badge tone={tone}>{topic.masteryScore}% mastery</Badge>
        </div>
      ))}
    </div>
  )
}

function ProfileEmpty({ text }: { text: string }) {
  return <div className="profile-small-empty">{text}</div>
}

function PasswordDialog({
  clearSession,
  close,
  navigateToLogin,
}: {
  clearSession: () => void
  close: () => void
  navigateToLogin: () => void
}) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      api.patch('/users/me/password', { currentPassword, newPassword }),
    onSuccess: () => {
      clearSession()
      navigateToLogin()
    },
    onError: (requestError) => setError(apiErrorMessage(requestError)),
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!currentPassword) {
      setError('Enter your current password.')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must contain at least eight characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    mutation.mutate()
  }

  return (
    <div className="profile-dialog-backdrop" role="presentation">
      <section
        aria-labelledby="change-password-title"
        aria-modal="true"
        className="profile-dialog"
        role="dialog"
      >
        <div className="row-between">
          <div>
            <Badge tone="purple">Account security</Badge>
            <h2 id="change-password-title">Change password</h2>
          </div>
          <button
            aria-label="Close password dialog"
            className="profile-dialog-close"
            disabled={mutation.isPending}
            onClick={close}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        <p className="muted">
          Changing your password signs you out of all active sessions.
        </p>

        {error ? (
          <div className="profile-notice error">
            <AlertCircle size={18} />
            {error}
          </div>
        ) : null}

        <form className="profile-password-form" onSubmit={submit}>
          <label>
            Current password
            <Input
              autoComplete="current-password"
              onChange={(event) => setCurrentPassword(event.target.value)}
              type="password"
              value={currentPassword}
            />
          </label>
          <label>
            New password
            <Input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              value={newPassword}
            />
          </label>
          <label>
            Confirm new password
            <Input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              value={confirmPassword}
            />
          </label>
          <div className="button-row profile-dialog-actions">
            <Button
              className="button-secondary"
              disabled={mutation.isPending}
              onClick={close}
              type="button"
            >
              Cancel
            </Button>
            <Button disabled={mutation.isPending} type="submit">
              <KeyRound size={17} />
              {mutation.isPending ? 'Updating…' : 'Update password'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="student-profile-page">
      <ProfileHeader />
      <div className="profile-hero-skeleton skeleton" />
      <div className="stat-grid">
        {[1, 2, 3, 4].map((item) => (
          <div className="skeleton" key={item} />
        ))}
      </div>
      <div className="profile-main-grid">
        <div className="profile-panel-skeleton skeleton" />
        <div className="profile-panel-skeleton skeleton" />
      </div>
    </div>
  )
}

function toDraft(data: StudentProfileData): StudentProfileDraft {
  return {
    name: data.user.name,
    phone: data.user.phone ?? '',
    avatar: data.user.avatar ?? '',
    gradeLevel: data.profile.gradeLevel ?? '',
    learningGoal: data.profile.learningGoal ?? '',
    preferredSubjects: data.profile.preferredSubjects.map(
      (subject) => subject.id,
    ),
  }
}

function nullableText(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function formatMonthYear(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function apiErrorMessage(error: unknown) {
  const response = (
    error as {
      response?: { data?: { message?: string; error?: { message?: string } } }
    }
  ).response

  return (
    response?.data?.message ||
    response?.data?.error?.message ||
    'Something went wrong. Please try again.'
  )
}
