import { RouteObject, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { GuestRoute } from '@/features/auth/components/GuestRoute'

// Design System Showcase Page
import DesignSystemPage from '@/pages/DesignSystem/DesignSystemPage'

// Auth Pages
import LoginPage from '@/features/auth/pages/LoginPage'
import RegisterPage from '@/features/auth/pages/RegisterPage'
import GymSetupWizardPage from '@/features/settings/pages/GymSetupWizardPage'

// Feature Pages
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import ReceptionDashboardPage from '@/features/dashboard/pages/ReceptionDashboardPage'
import MembersListPage from '@/features/members/pages/MembersListPage'
import MemberCreatePage from '@/features/members/pages/MemberCreatePage'
import MemberDetailPage from '@/features/members/pages/MemberDetailPage'
import MemberSearchPage from '@/features/members/pages/MemberSearchPage'
import SubscriptionsListPage from '@/features/subscriptions/pages/SubscriptionsListPage'
import SubscriptionCreatePage from '@/features/subscriptions/pages/SubscriptionCreatePage'
import SubscriptionDetailPage from '@/features/subscriptions/pages/SubscriptionDetailPage'
import SubscriptionRenewPage from '@/features/subscriptions/pages/SubscriptionRenewPage'
import PlansListPage from '@/features/subscriptions/pages/PlansListPage'
import PlanCreatePage from '@/features/subscriptions/pages/PlanCreatePage'
import PlanEditPage from '@/features/subscriptions/pages/PlanEditPage'
import PaymentsListPage from '@/features/payments/pages/PaymentsListPage'
import PaymentCreatePage from '@/features/payments/pages/PaymentCreatePage'
import PaymentDetailPage from '@/features/payments/pages/PaymentDetailPage'
import AttendancePage from '@/features/attendance/pages/AttendancePage'
import TraineeAttendancePage from '@/features/attendance/pages/TraineeAttendancePage'
import TrainersListPage from '@/features/trainers/pages/TrainersListPage'
import TrainerCreatePage from '@/features/trainers/pages/TrainerCreatePage'
import TrainerDetailPage from '@/features/trainers/pages/TrainerDetailPage'
import TrainerDashboardPage from '@/features/trainers/pages/TrainerDashboardPage'
import TrainerTraineesPage from '@/features/trainers/pages/TrainerTraineesPage'
import ReportsPage from '@/features/reports/pages/ReportsPage'
import NotificationsPage from '@/features/notifications/pages/NotificationsPage'
import UsersListPage from '@/features/users/pages/UsersListPage'
import ActivityLogPage from '@/features/users/pages/ActivityLogPage'
import SettingsPage from '@/features/settings/pages/SettingsPage'
import ProfilePage from '@/features/settings/pages/ProfilePage'

// Error Pages
import NotFoundPage from '@/pages/errors/NotFoundPage'
import ForbiddenPage from '@/pages/errors/ForbiddenPage'
import ServerErrorPage from '@/pages/errors/ServerErrorPage'

export const routes: RouteObject[] = [
  // Root Redirect to Login
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },

  // Design System Showcase Route
  {
    path: '/design-system',
    element: <DesignSystemPage />,
  },

  // Gym Onboarding / Setup Wizard Route
  {
    path: '/setup',
    element: <GymSetupWizardPage />,
  },
  {
    path: '/onboarding',
    element: <GymSetupWizardPage />,
  },

  // Guest Routes (Auth)
  {
    element: <GuestRoute />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
    ],
  },

  // Authenticated App Shell Routes
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/app/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'reception/dashboard',
        element: <ReceptionDashboardPage />,
      },
      {
        path: 'reception',
        element: <ReceptionDashboardPage />,
      },
      // Setup Wizard inside App Shell
      {
        path: 'setup',
        element: <GymSetupWizardPage />,
      },
      // Members
      {
        path: 'members',
        element: <MembersListPage />,
      },
      {
        path: 'members/search',
        element: <MemberSearchPage />,
      },
      {
        path: 'search',
        element: <MemberSearchPage />,
      },
      {
        path: 'members/new',
        element: <MemberCreatePage />,
      },
      {
        path: 'members/:id',
        element: <MemberDetailPage />,
      },
      // Membership Plans
      {
        path: 'plans',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}>
            <PlansListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'plans/new',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}>
            <PlanCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'plans/:id/edit',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}>
            <PlanEditPage />
          </ProtectedRoute>
        ),
      },
      // Subscriptions
      {
        path: 'subscriptions',
        element: <SubscriptionsListPage />,
      },
      {
        path: 'subscriptions/new',
        element: <SubscriptionCreatePage />,
      },
      {
        path: 'subscriptions/:id',
        element: <SubscriptionDetailPage />,
      },
      {
        path: 'subscriptions/:id/renew',
        element: <SubscriptionRenewPage />,
      },
      {
        path: 'subscriptions/renew',
        element: <SubscriptionRenewPage />,
      },
      // Payments
      {
        path: 'payments',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <PaymentsListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'payments/new',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <PaymentCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'payments/:id',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <PaymentDetailPage />
          </ProtectedRoute>
        ),
      },
      // Attendance
      {
        path: 'attendance',
        element: <AttendancePage />,
      },
      {
        path: 'attendance/trainees',
        element: <TraineeAttendancePage />,
      },
      {
        path: 'trainees/attendance',
        element: <TraineeAttendancePage />,
      },
      {
        path: 'trainer/attendance',
        element: <TraineeAttendancePage />,
      },
      {
        path: 'trainer/dashboard',
        element: <TrainerDashboardPage />,
      },
      {
        path: 'trainer/trainees',
        element: <TrainerTraineesPage />,
      },
      {
        path: 'trainees',
        element: <TrainerTraineesPage />,
      },
      {
        path: 'trainer',
        element: <TrainerDashboardPage />,
      },
      // Trainers
      {
        path: 'trainers',
        element: <TrainersListPage />,
      },
      {
        path: 'trainers/new',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}>
            <TrainerCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainers/:id',
        element: <TrainerDetailPage />,
      },
      // Reports
      {
        path: 'reports',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}>
            <ReportsPage />
          </ProtectedRoute>
        ),
      },
      // Notifications
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      // Users & Roles
      {
        path: 'users',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}>
            <UsersListPage />
          </ProtectedRoute>
        ),
      },
      // Activity Log
      {
        path: 'activity-log',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}>
            <ActivityLogPage />
          </ProtectedRoute>
        ),
      },
      // Settings & Profile
      {
        path: 'settings',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
    ],
  },

  // Standalone Error Pages
  {
    path: '/403',
    element: <ForbiddenPage />,
  },
  {
    path: '/500',
    element: <ServerErrorPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]
