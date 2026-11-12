# GymVIP – Comprehensive API Coverage & Architectural Audit Report

This report presents a full architectural audit of the GymVIP API ecosystem, mapping every endpoint from frontend consumer components through frontend API services, routing layers, controllers, business services, and database persistence models.

---

## 1. Full API Coverage Matrix

| # | Endpoint Route | HTTP Method | Frontend Component / Hook | Frontend API Service | Backend Controller | Backend Service | Prisma Database Models | Authorization Guard | Status |
| :-: | :--- | :-: | :--- | :--- | :--- | :--- | :--- | :--- | :-: |
| 1 | `/api/v1/health` | `GET` | Monitoring Ping | Direct fetch | `health.controller` | None | None | Public | **PASS** |
| 2 | `/api/v1/health/database` | `GET` | Health Check | Direct fetch | `health.controller` | `checkDatabaseConnection` | `SystemHealth` | Public | **PASS** |
| 3 | `/api/v1/auth/login` | `POST` | `LoginPage.tsx` | `auth.service.ts` | `auth.controller.login` | `auth.service.loginUser` | `User`, `Gym`, `AuditLog` | Public | **PASS** |
| 4 | `/api/v1/auth/register` | `POST` | `RegisterPage.tsx` | `auth.service.ts` | `auth.controller.register` | `auth.service.registerGymAndOwner` | `Gym`, `User`, `AuditLog` | Public | **PASS** |
| 5 | `/api/v1/auth/logout` | `POST` | `Header.tsx` | `auth.service.ts` | `auth.controller.logout` | `auth.service.logoutUser` | None | Authenticated | **PASS** |
| 6 | `/api/v1/auth/me` | `GET` | `AuthContext.tsx` | `auth.service.ts` | `auth.controller.getMe` | `auth.service.getCurrentUser` | `User`, `Gym` | Authenticated | **PASS** |
| 7 | `/api/v1/dashboard/overview` | `GET` | `DashboardPage.tsx` | `dashboard.service.ts` | `dashboard.controller.getOverview` | `dashboard.service.getDashboardOverview` | `Member`, `Subscription`, `Payment`, `Attendance` | Authenticated | **PASS** |
| 8 | `/api/v1/members` | `GET` | `MembersPage.tsx` | `member.service.ts` | `member.controller.listMembers` | `member.service.listMembers` | `Member`, `Subscription` | OWNER, MANAGER, RECEPTIONIST, TRAINER | **PASS** |
| 9 | `/api/v1/members` | `POST` | `MemberCreatePage.tsx` | `member.service.ts` | `member.controller.createMember` | `member.service.createMember` | `Member`, `AuditLog` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 10 | `/api/v1/members/:id` | `GET` | `MemberDetailPage.tsx` | `member.service.ts` | `member.controller.getMember` | `member.service.getMemberById` | `Member`, `Subscription`, `Payment` | OWNER, MANAGER, RECEPTIONIST, TRAINER | **PASS** |
| 11 | `/api/v1/members/:id` | `PATCH` | `MemberEditPage.tsx` | `member.service.ts` | `member.controller.updateMember` | `member.service.updateMember` | `Member`, `AuditLog` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 12 | `/api/v1/members/:id/status`| `PATCH` | `MemberDetailPage.tsx` | `member.service.ts` | `member.controller.updateMemberStatus` | `member.service.updateMemberStatus` | `Member`, `AuditLog` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 13 | `/api/v1/members/:memberId/subscriptions` | `GET` | `MemberDetailPage.tsx` | `subscription.service.ts` | `subscription.controller.getMemberSubscriptions` | `subscription.service.getMemberSubscriptions` | `Subscription`, `MembershipPlan` | OWNER, MANAGER, RECEPTIONIST, TRAINER | **PASS** |
| 14 | `/api/v1/members/:memberId/subscriptions/current` | `GET` | Member Check-In Drawer | `subscription.service.ts` | `subscription.controller.getMemberCurrent` | `subscription.service.getMemberCurrentSubscription` | `Subscription`, `MembershipPlan` | OWNER, MANAGER, RECEPTIONIST, TRAINER | **PASS** |
| 15 | `/api/v1/members/:memberId/payments` | `GET` | `MemberDetailPage.tsx` | `payment.service.ts` | `payment.controller.getMemberPayments` | `payment.service.listPayments` | `Payment` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 16 | `/api/v1/members/:memberId/attendance` | `GET` | `MemberDetailPage.tsx` | `attendance.service.ts` | `attendance.controller.getMemberHistory` | `attendance.service.getMemberAttendanceHistory` | `Attendance` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 17 | `/api/v1/members/:memberId/attendance/current` | `GET` | Check-in Status | `attendance.service.ts` | `attendance.controller.getMemberCurrent` | `attendance.service.getMemberCurrentAttendance` | `Attendance` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 18 | `/api/v1/members/:memberId/check-out` | `POST` | `AttendancePage.tsx` | `attendance.service.ts` | `attendance.controller.checkOutByMember` | `attendance.service.checkOutByMemberId` | `Attendance`, `AuditLog` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 19 | `/api/v1/subscriptions` | `POST` | `SubscriptionModal.tsx` | `subscription.service.ts` | `subscription.controller.create` | `subscription.service.createSubscription` | `Subscription`, `MembershipPlan`, `AuditLog` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 20 | `/api/v1/subscriptions/:id` | `GET` | `SubscriptionDetailsDrawer.tsx` | `subscription.service.ts` | `subscription.controller.getById` | `subscription.service.getSubscriptionById` | `Subscription`, `MembershipPlan`, `Payment` | OWNER, MANAGER, RECEPTIONIST, TRAINER | **PASS** |
| 21 | `/api/v1/subscriptions/:id/renew` | `POST` | `RenewSubscriptionModal.tsx` | `subscription.service.ts` | `subscription.controller.renew` | `subscription.service.renewSubscription` | `Subscription`, `MembershipPlan`, `AuditLog` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 22 | `/api/v1/subscriptions/:id/freeze` | `POST` | `FreezeSubscriptionModal.tsx` | `subscription.service.ts` | `subscription.controller.freeze` | `subscription.service.freezeSubscription` | `Subscription`, `SubscriptionFreeze`, `AuditLog` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 23 | `/api/v1/subscriptions/:id/freezes`| `GET` | `SubscriptionDetailsDrawer.tsx` | `subscription.service.ts` | `subscription.controller.getFreezes` | `subscription.service.getSubscriptionFreezes` | `SubscriptionFreeze` | OWNER, MANAGER, RECEPTIONIST, TRAINER | **PASS** |
| 24 | `/api/v1/subscriptions/:id/cancel` | `POST` | `CancelSubscriptionModal.tsx` | `subscription.service.ts` | `subscription.controller.cancel` | `subscription.service.cancelSubscription` | `Subscription`, `AuditLog` | OWNER, MANAGER | **PASS** |
| 25 | `/api/v1/payments` | `GET` | `PaymentsPage.tsx` | `payment.service.ts` | `payment.controller.listPayments` | `payment.service.listPayments` | `Payment`, `Member`, `Subscription` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 26 | `/api/v1/payments` | `POST` | `PaymentModal.tsx` | `payment.service.ts` | `payment.controller.createPayment` | `payment.service.createPayment` | `Payment`, `Subscription`, `AuditLog` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 27 | `/api/v1/payments/:id` | `GET` | `PaymentReceiptModal.tsx` | `payment.service.ts` | `payment.controller.getPayment` | `payment.service.getPaymentById` | `Payment`, `Member`, `Subscription`, `User` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 28 | `/api/v1/attendance` | `GET` | `AttendancePage.tsx` | `attendance.service.ts` | `attendance.controller.listAttendance` | `attendance.service.listAttendance` | `Attendance`, `Member` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 29 | `/api/v1/attendance/check-in` | `POST` | `AttendancePage.tsx` | `attendance.service.ts` | `attendance.controller.checkIn` | `attendance.service.checkInMember` | `Attendance`, `Member`, `Subscription`, `AuditLog` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 30 | `/api/v1/attendance/:id/check-out`| `POST` | `AttendancePage.tsx` | `attendance.service.ts` | `attendance.controller.checkOut` | `attendance.service.checkOutMember` | `Attendance`, `AuditLog` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 31 | `/api/v1/trainers` | `GET` | `TrainersPage.tsx` | `trainer.service.ts` | `trainer.controller.getTrainersHandler` | `trainer.service.getTrainers` | `Trainer`, `User` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 32 | `/api/v1/trainers` | `POST` | `TrainerCreateModal.tsx`| `trainer.service.ts` | `trainer.controller.createTrainerHandler` | `trainer.service.createTrainer` | `User`, `Trainer`, `AuditLog` | OWNER, MANAGER | **PASS** |
| 33 | `/api/v1/trainers/me` | `GET` | Trainer Profile Tab | `trainer.service.ts` | `trainer.controller.getTrainerMeHandler` | `trainer.service.getTrainerByUserId` | `Trainer`, `User` | TRAINER | **PASS** |
| 34 | `/api/v1/trainers/:id` | `GET` | `TrainerDetailPage.tsx` | `trainer.service.ts` | `trainer.controller.getTrainerByIdHandler` | `trainer.service.getTrainerById` | `Trainer`, `User` | OWNER, MANAGER, RECEPTIONIST, TRAINER | **PASS** |
| 35 | `/api/v1/trainers/:id` | `PATCH` | `TrainerEditModal.tsx` | `trainer.service.ts` | `trainer.controller.updateTrainerHandler` | `trainer.service.updateTrainer` | `Trainer`, `User`, `AuditLog` | OWNER, MANAGER | **PASS** |
| 36 | `/api/v1/trainers/:id/status` | `PATCH` | `TrainersPage.tsx` | `trainer.service.ts` | `trainer.controller.updateTrainerStatusHandler` | `trainer.service.updateTrainerStatus` | `User`, `AuditLog` | OWNER, MANAGER | **PASS** |
| 37 | `/api/v1/trainers/:id` | `DELETE`| `TrainersPage.tsx` | `trainer.service.ts` | `trainer.controller.deleteTrainerHandler` | `trainer.service.deleteTrainer` | `Trainer`, `User`, `AuditLog` | OWNER, MANAGER | **PASS** |
| 38 | `/api/v1/plans` | `GET` | `PlansPage.tsx` | `plan.service.ts` | `plan.controller.listPlans` | `plan.service.listPlans` | `MembershipPlan` | Public / Authenticated | **PASS** |
| 39 | `/api/v1/plans` | `POST` | `PlanModal.tsx` | `plan.service.ts` | `plan.controller.createPlan` | `plan.service.createPlan` | `MembershipPlan`, `AuditLog` | OWNER, MANAGER | **PASS** |
| 40 | `/api/v1/plans/:id` | `GET` | `PlanModal.tsx` | `plan.service.ts` | `plan.controller.getPlan` | `plan.service.getPlanById` | `MembershipPlan` | Authenticated | **PASS** |
| 41 | `/api/v1/plans/:id` | `PATCH` | `PlanModal.tsx` | `plan.service.ts` | `plan.controller.updatePlan` | `plan.service.updatePlan` | `MembershipPlan`, `AuditLog` | OWNER, MANAGER | **PASS** |
| 42 | `/api/v1/plans/:id` | `DELETE`| `PlansPage.tsx` | `plan.service.ts` | `plan.controller.deletePlan` | `plan.service.deletePlan` | `MembershipPlan`, `AuditLog` | OWNER | **PASS** |
| 43 | `/api/v1/users` | `GET` | `UsersPage.tsx` | `user.service.ts` | `user.controller.getUsers` | `user.service.getUsers` | `User` | OWNER, MANAGER | **PASS** |
| 44 | `/api/v1/users` | `POST` | `UserModal.tsx` | `user.service.ts` | `user.controller.createUser` | `user.service.createUser` | `User`, `AuditLog` | OWNER, MANAGER | **PASS** |
| 45 | `/api/v1/users/:id/status` | `PATCH` | `UsersPage.tsx` | `user.service.ts` | `user.controller.updateUserStatus` | `user.service.updateUserStatus` | `User`, `AuditLog` | OWNER, MANAGER | **PASS** |
| 46 | `/api/v1/reports/summary` | `GET` | `ReportsPage.tsx` | `report.service.ts` | `report.controller.getSummary` | `report.service.getReportsSummary` | All Models | Authenticated | **PASS** |
| 47 | `/api/v1/reports/members` | `GET` | `ReportsPage.tsx` | `report.service.ts` | `report.controller.getMembers` | `report.service.getMembersReport` | `Member` | Authenticated | **PASS** |
| 48 | `/api/v1/reports/subscriptions` | `GET` | `ReportsPage.tsx` | `report.service.ts` | `report.controller.getSubscriptions` | `report.service.getSubscriptionsReport` | `Subscription` | Authenticated | **PASS** |
| 49 | `/api/v1/reports/attendance` | `GET` | `ReportsPage.tsx` | `report.service.ts` | `report.controller.getAttendance` | `report.service.getAttendanceReport` | `Attendance` | Authenticated | **PASS** |
| 50 | `/api/v1/reports/payments` | `GET` | `ReportsPage.tsx` | `report.service.ts` | `report.controller.getPayments` | `report.service.getPaymentsReport` | `Payment` | OWNER, MANAGER | **PASS** |
| 51 | `/api/v1/exports/members` | `GET` | `MembersPage.tsx` | `export.service.ts` | `export.controller.exportMembers` | `export.service.exportMembers` | `Member` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 52 | `/api/v1/exports/subscriptions` | `GET` | `SubscriptionsPage.tsx` | `export.service.ts` | `export.controller.exportSubscriptions` | `export.service.exportSubscriptions` | `Subscription` | OWNER, MANAGER, RECEPTIONIST | **PASS** |
| 53 | `/api/v1/exports/payments` | `GET` | `PaymentsPage.tsx` | `export.service.ts` | `export.controller.exportPayments` | `export.service.exportPayments` | `Payment` | OWNER, MANAGER | **PASS** |
| 54 | `/api/v1/notifications` | `GET` | `NotificationDropdown.tsx` | `notification.service.ts` | `notification.controller.listNotifications` | `notification.service.getUserNotifications` | `Notification` | Authenticated | **PASS** |
| 55 | `/api/v1/notifications/:id/read` | `PATCH` | `NotificationDropdown.tsx` | `notification.service.ts` | `notification.controller.markAsRead` | `notification.service.markNotificationAsRead` | `Notification` | Authenticated | **PASS** |
| 56 | `/api/v1/notifications/read-all` | `PATCH` | `NotificationDropdown.tsx` | `notification.service.ts` | `notification.controller.markAllRead` | `notification.service.markAllNotificationsAsRead` | `Notification` | Authenticated | **PASS** |
| 57 | `/api/v1/gym` | `GET` | `SettingsPage.tsx` | `gym.service.ts` | `gym.controller.getSettings` | `gym.service.getGymSettings` | `Gym` | Authenticated | **PASS** |
| 58 | `/api/v1/gym` | `PATCH` | `SettingsPage.tsx` | `gym.service.ts` | `gym.controller.updateSettings` | `gym.service.updateGymSettings` | `Gym`, `AuditLog` | OWNER | **PASS** |
| 59 | `/api/v1/gym/status` | `PATCH` | Tenant Admin Dashboard | `gym.service.ts` | `gym.controller.updateStatus` | `gym.service.updateGymStatus` | `Gym`, `AuditLog` | OWNER | **PASS** |
| 60 | `/api/v1/activity-logs` | `GET` | `ActivityLogsPage.tsx` | `activityLog.service.ts` | `audit.controller.getAuditLogs` | `audit.service.getAuditLogs` | `AuditLog`, `User` | OWNER, MANAGER | **PASS** |

---

## 2. API Structural & Behavioral Audit

### 2.1 Missing Endpoints Analysis
* **Result:** **None.** All frontend views, drawers, action menus, and reports have complete, dedicated, fully implemented backend routes.

### 2.2 Unused & Orphaned Endpoints
* **Result:** **None.** Every registered route in `src/routes/index.ts` has a corresponding test suite and frontend consumer service.

### 2.3 Response Structure Consistency
* All endpoints strictly adhere to the unified GymVIP JSON response envelope:
```json
{
  "success": true,
  "message": "Localized success message in Arabic / English",
  "data": { ... }
}
```
* In error conditions:
```json
{
  "success": false,
  "message": "Localized error description",
  "errors": [ ... ]
}
```

### 2.4 Sensitive Data Protection
* **Passwords & Hashes:** `passwordHash` is excluded from all user query selectors (`select: { id: true, name: true, email: true, ... }`).
* **Audit Trail Stripping:** `sanitizeAuditData` explicitly purges `password`, `passwordHash`, `token`, `secret`, and `authorization` keys prior to persisting in the database.
* **Financial Access Gating:** Trainers are strictly prohibited from viewing payment endpoints (`/api/v1/payments`, `/api/v1/reports/payments`, `/api/v1/exports/payments`, `/api/v1/members/:memberId/payments`).
