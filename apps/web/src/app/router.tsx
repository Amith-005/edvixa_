import { lazy, type ComponentType } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute, RoleRoute } from '../components/guards'
import { PortalLayout } from '../components/portal-layout'
import { AccessDeniedPage, LandingPage, NotFoundPage, RouteErrorPage } from '../features/shared/pages'

const namedLazy = (loader: () => Promise<Record<string, unknown>>, name: string) =>
  lazy(async () => ({ default: (await loader())[name] as ComponentType }))

const LoginPage = namedLazy(() => import('../features/auth/pages'), 'LoginPage')
const RegisterPage = namedLazy(() => import('../features/auth/pages'), 'RegisterPage')
const ForgotPasswordPage = namedLazy(() => import('../features/auth/pages'), 'ForgotPasswordPage')
const ResetPasswordPage = namedLazy(() => import('../features/auth/pages'), 'ResetPasswordPage')
const VerifyEmailPage = namedLazy(() => import('../features/auth/pages'), 'VerifyEmailPage')

const StudentDashboardPage = namedLazy(() => import('../features/student/dashboard/student-dashboard-page'), 'StudentDashboardPage')
const StudentProfilePage = namedLazy(() => import('../features/student/profile/student-profile-page'), 'StudentProfilePage')
const PracticeSetupPage = namedLazy(() => import('../features/student/practice/practice-setup-page'), 'PracticeSetupPage')
const ActivePracticePage = namedLazy(() => import('../features/student/practice/active-practice-page'), 'ActivePracticePage')
const ResultsHistoryPage = namedLazy(() => import('../features/student/results/results-history-page'), 'ResultsHistoryPage')
const PracticeResultPage = namedLazy(() => import('../features/student/results/practice-result-page'), 'PracticeResultPage')
const AnswerReviewPage = namedLazy(() => import('../features/student/results/answer-review-page'), 'AnswerReviewPage')
const StudentProgressPage = namedLazy(() => import('../features/student/progress/student-progress-page'), 'StudentProgressPage')
const StudentDoubtPollsPage = namedLazy(() => import('../features/student/doubts/student-doubt-polls-page'), 'StudentDoubtPollsPage')
const TeacherDiscoveryPage = namedLazy(() => import('../features/student/teachers/teacher-discovery-page'), 'TeacherDiscoveryPage')
const TeacherProfilePage = namedLazy(() => import('../features/student/teachers/teacher-profile-page'), 'TeacherProfilePage')
const BookingCheckoutPage = namedLazy(() => import('../features/student/checkout/booking-checkout-page'), 'BookingCheckoutPage')
const StudentSessionsPage = namedLazy(() => import('../features/student/sessions/student-sessions-page'), 'StudentSessionsPage')
const StudentLeaderboardPage = namedLazy(() => import('../features/student/leaderboard/student-leaderboard-page'), 'StudentLeaderboardPage')
const StudentFeesPage = namedLazy(() => import('../features/student/fees/student-fees-page'), 'StudentFeesPage')
const AnnouncementsPage = namedLazy(() => import('../features/shared/announcements-page'), 'AnnouncementsPage')
const SupportPage = namedLazy(() => import('../features/shared/support-page'), 'SupportPage')

const TeacherDashboardPage = namedLazy(() => import('../features/teacher/dashboard/teacher-dashboard-page'), 'TeacherDashboardPage')
const TeacherProfileSetupPage = namedLazy(() => import('../features/teacher/profile/teacher-profile-setup-page'), 'TeacherProfileSetupPage')
const TeacherSlotsPage = namedLazy(() => import('../features/teacher/slots/teacher-slots-page'), 'TeacherSlotsPage')
const TeacherBookingRequestsPage = namedLazy(() => import('../features/teacher/bookings/teacher-booking-requests-page'), 'TeacherBookingRequestsPage')
const TeacherDoubtPollsPage = namedLazy(() => import('../features/teacher/doubts/teacher-doubt-polls-page'), 'TeacherDoubtPollsPage')
const TeacherSessionsPage = namedLazy(() => import('../features/teacher/sessions/teacher-sessions-page'), 'TeacherSessionsPage')
const TeacherEarningsPage = namedLazy(() => import('../features/teacher/earnings/teacher-earnings-page'), 'TeacherEarningsPage')
const TeacherStudentsPage = namedLazy(() => import('../features/teacher/students/teacher-students-page'), 'TeacherStudentsPage')

const AdminDashboardPage = lazy(() => import('../features/admin/pages/admin-dashboard-page'))
const AdminUsersPage = lazy(() => import('../features/admin/pages/admin-users-page'))
const AdminUserDetailsPage = lazy(() => import('../features/admin/pages/admin-user-details-page'))
const AdminTeachersPage = lazy(() => import('../features/admin/pages/admin-teachers-page'))
const AdminBookingsPage = lazy(() => import('../features/admin/pages/admin-bookings-page'))
const AdminFeesPage = lazy(() => import('../features/admin/pages/admin-fees-page'))
const AdminSubjectsPage = lazy(() => import('../features/admin/pages/admin-subjects-page'))
const AdminAnalyticsPage = lazy(() => import('../features/admin/pages/admin-analytics-page'))
const AdminReportsPage = lazy(() => import('../features/admin/pages/admin-reports-page'))
const AdminAnnouncementsPage = lazy(() => import('../features/admin/pages/admin-announcements-page'))
const AdminSettingsPage = lazy(() => import('../features/admin/pages/admin-settings-page'))
const AdminRolesPage = lazy(() => import('../features/admin/pages/admin-roles-page'))
const AdminSecurityPage = lazy(() => import('../features/admin/pages/admin-security-page'))
const AdminSupportPage = lazy(() => import('../features/admin/pages/admin-support-page'))


export const router = createBrowserRouter([
  { path: '/', element: <LandingPage/>, errorElement: <RouteErrorPage/> },
  { path: '/login', element: <LoginPage/> },
  { path: '/register', element: <RegisterPage/> },
  { path: '/forgot-password', element: <ForgotPasswordPage/> },
  { path: '/reset-password', element: <ResetPasswordPage/> },
  { path: '/verify-email', element: <VerifyEmailPage/> },
  { path: '/access-denied', element: <AccessDeniedPage/> },
  { element: <ProtectedRoute/>, errorElement: <RouteErrorPage/>, children: [
    { element: <RoleRoute roles={['student']}/>, children: [{ path: '/student', element: <PortalLayout/>, children: [
      { index: true, element: <Navigate to="dashboard" replace/> },
      { path: 'dashboard', element: <StudentDashboardPage/> },
      { path: 'profile', element: <StudentProfilePage/> },
      { path: 'practice', element: <PracticeSetupPage/> },
      { path: 'practice/:id', element: <ActivePracticePage/> },
      { path: 'results', element: <ResultsHistoryPage/> },
      { path: 'results/:id', element: <PracticeResultPage/> },
      { path: 'results/:id/review', element: <AnswerReviewPage/> },
      { path: 'progress', element: <StudentProgressPage/> },
      { path: 'doubts', element: <StudentDoubtPollsPage/> },
      { path: 'leaderboard', element: <StudentLeaderboardPage/> },
      { path: 'teachers', element: <TeacherDiscoveryPage/> },
      { path: 'teachers/:id', element: <TeacherProfilePage/> },
      { path: 'checkout', element: <BookingCheckoutPage/> },
      { path: 'sessions', element: <StudentSessionsPage/> },
      { path: 'notifications', element: <AnnouncementsPage/> },
      { path: 'fees', element: <StudentFeesPage/> },
      { path: 'support', element: <SupportPage/> },
    ] }] },
    { element: <RoleRoute roles={['teacher']}/>, children: [{ path: '/teacher', element: <PortalLayout/>, children: [
      { index: true, element: <Navigate to="dashboard" replace/> },
      { path: 'dashboard', element: <TeacherDashboardPage/> },
      { path: 'profile', element: <TeacherProfileSetupPage/> },
      { path: 'slots', element: <TeacherSlotsPage/> },
      { path: 'bookings', element: <TeacherBookingRequestsPage/> },
      { path: 'doubts', element: <TeacherDoubtPollsPage/> },
      { path: 'sessions', element: <TeacherSessionsPage/> },
      { path: 'earnings', element: <TeacherEarningsPage/> },
      { path: 'students', element: <TeacherStudentsPage/> },
      { path: 'notifications', element: <AnnouncementsPage/> },
      { path: 'support', element: <SupportPage/> },
    ] }] },
    { element: <RoleRoute roles={['admin']}/>, children: [{ path: '/admin', element: <PortalLayout/>, children: [
      { index: true, element: <Navigate to="dashboard" replace/> },
      { path: 'dashboard', element: <AdminDashboardPage/> },
      { path: 'users', element: <AdminUsersPage/> },
      { path: 'users/:id', element: <AdminUserDetailsPage/> },
      { path: 'teachers', element: <AdminTeachersPage/> },
      { path: 'bookings', element: <AdminBookingsPage/> },
      { path: 'fees', element: <AdminFeesPage/> },
      { path: 'subjects', element: <AdminSubjectsPage/> },
      { path: 'analytics', element: <AdminAnalyticsPage/> },
      { path: 'reports', element: <AdminReportsPage/> },
      { path: 'notifications', element: <AdminAnnouncementsPage/> },
      { path: 'settings', element: <AdminSettingsPage/> },
      { path: 'roles', element: <AdminRolesPage/> },
      { path: 'security', element: <AdminSecurityPage/> },
      { path: 'support', element: <AdminSupportPage/> },
    ] }] },
  ] },
  { path: '*', element: <NotFoundPage/> },
])
