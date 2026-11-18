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
import UnauthorizedPage from '@/pages/errors/UnauthorizedPage'

import { useAuth } from '@/features/auth/context/AuthContext'

const RoleBasedDashboardRouter: React.FC = () => {
  const { user } = useAuth()
  if (user?.role === 'TRAINER') {
    return <Navigate to="/app/trainer/dashboard" replace />
  }
  if (user?.role === 'RECEPTIONIST') {
    return <Navigate to="/app/reception/dashboard" replace />
  }
  return <DashboardPage />
}

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
        element: <RoleBasedDashboardRouter />,
      },
      {
        path: 'dashboard',
        element: <RoleBasedDashboardRouter />,
      },
      {
        path: 'reception/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <ReceptionDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reception',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <ReceptionDashboardPage />
          </ProtectedRoute>
        ),
      },
      // Setup Wizard inside App Shell
      {
        path: 'setup',
        element: (
          <ProtectedRoute allowedRoles={['OWNER']}>
            <GymSetupWizardPage />
          </ProtectedRoute>
        ),
      },
      // Members
      {
        path: 'members',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <MembersListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'members/search',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <MemberSearchPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'search',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <MemberSearchPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'members/new',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <MemberCreatePage />
          </ProtectedRoute>
        ),
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
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <SubscriptionsListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'subscriptions/new',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <SubscriptionCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'subscriptions/:id',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <SubscriptionDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'subscriptions/:id/renew',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <SubscriptionRenewPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'subscriptions/renew',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <SubscriptionRenewPage />
          </ProtectedRoute>
        ),
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
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <AttendancePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'attendance/trainees',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'TRAINER']}>
            <TraineeAttendancePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainees/attendance',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'TRAINER']}>
            <TraineeAttendancePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainer/attendance',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'TRAINER']}>
            <TraineeAttendancePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainer/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'TRAINER']}>
            <TrainerDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainer/trainees',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'TRAINER']}>
            <TrainerTraineesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainees',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'TRAINER']}>
            <TrainerTraineesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainer',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'TRAINER']}>
            <TrainerDashboardPage />
          </ProtectedRoute>
        ),
      },
      // Trainers
      {
        path: 'trainers',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <TrainersListPage />
          </ProtectedRoute>
        ),
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
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'RECEPTIONIST']}>
            <TrainerDetailPage />
          </ProtectedRoute>
        ),
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
      // In-App Unauthorized Page (maintains sidebar & header layout)
      {
        path: 'unauthorized',
        element: <UnauthorizedPage />,
      },
    ],
  },

  // Standalone Error Pages
  {
    path: '/403',
    element: <ForbiddenPage />,
  },
  {
    path: '/unauthorized',
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
