# GymVIP – Complete Functionality Matrix

This matrix maps every functional capability across the GymVIP platform from the Frontend User Interface through the API layer down to the MySQL Database models, detailing verification status and execution flow.

---

## 1. Authentication & Session Module

| Feature / Capability | Frontend Component / File | Backend Route & Method | Controller & Service | Database Models | Execution Flow Status | Test Status | Production Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **Login with Email & Password** | `src/pages/LoginPage.tsx` | `POST /api/v1/auth/login` | `auth.controller.login` $\rightarrow$ `auth.service.loginUser` | `User`, `Gym`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Logout & Cookie Clearance** | `src/components/layout/Header.tsx` | `POST /api/v1/auth/logout` | `auth.controller.logout` $\rightarrow$ `auth.service.logoutUser` | None (Token Cookie) | UI $\rightarrow$ API $\rightarrow$ Cookie | **PASS** | Ready |
| **Current User Profile Retrieval** | `src/context/AuthContext.tsx` | `GET /api/v1/auth/me` | `auth.controller.getMe` $\rightarrow$ `auth.service.getCurrentUser` | `User`, `Gym` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Gym Registration & Initial Setup**| `src/pages/RegisterPage.tsx` | `POST /api/v1/auth/register` | `auth.controller.register` $\rightarrow$ `auth.service.registerGymAndOwner` | `Gym`, `User`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Session Persistence on Refresh** | `src/context/AuthContext.tsx` | `GET /api/v1/auth/me` | `auth.middleware.requireAuth` | `User` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Unauthorized Access Interception**| `src/components/auth/ProtectedRoute.tsx` | Middleware Interceptor | `appError.unauthorized` | None | UI $\rightarrow$ Auth Guard | **PASS** | Ready |

---

## 2. Dashboard & Analytics Module

| Feature / Capability | Frontend Component / File | Backend Route & Method | Controller & Service | Database Models | Execution Flow Status | Test Status | Production Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **KPI Metrics Overview** | `src/pages/DashboardPage.tsx` | `GET /api/v1/dashboard/overview` | `dashboard.controller.getOverview` $\rightarrow$ `dashboard.service` | `Member`, `Subscription`, `Payment`, `Attendance` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Attendance Trends Chart** | `src/components/dashboard/AttendanceChart.tsx` | `GET /api/v1/dashboard/overview` | `dashboard.service.getDashboardOverview` | `Attendance` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Revenue Summary (Role Guarded)**| `src/pages/DashboardPage.tsx` | `GET /api/v1/dashboard/overview` | Redacted for TRAINER role | `Payment` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Recent Activity Feed** | `src/pages/DashboardPage.tsx` | `GET /api/v1/dashboard/overview` | `dashboard.service.getDashboardOverview` | `AuditLog`, `User` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |

---

## 3. Members Management Module

| Feature / Capability | Frontend Component / File | Backend Route & Method | Controller & Service | Database Models | Execution Flow Status | Test Status | Production Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **List Members with Pagination** | `src/pages/MembersPage.tsx` | `GET /api/v1/members` | `member.controller.listMembers` $\rightarrow$ `member.service.listMembers` | `Member`, `Subscription` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Search by Name / Phone / Code** | `src/pages/MembersPage.tsx` | `GET /api/v1/members?search=...` | `member.service.listMembers` | `Member` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Filter by Status & Gender** | `src/pages/MembersPage.tsx` | `GET /api/v1/members?status=...` | `member.service.listMembers` | `Member` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Create New Member** | `src/pages/MemberCreatePage.tsx` | `POST /api/v1/members` | `member.controller.createMember` $\rightarrow$ `member.service.createMember` | `Member`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **View Member Profile Details** | `src/pages/MemberDetailPage.tsx` | `GET /api/v1/members/:id` | `member.controller.getMember` $\rightarrow$ `member.service.getMemberById` | `Member`, `Subscription` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Update Member Details** | `src/pages/MemberEditPage.tsx` | `PATCH /api/v1/members/:id` | `member.controller.updateMember` $\rightarrow$ `member.service.updateMember` | `Member`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Upload / Update Member Avatar** | `src/pages/MemberCreatePage.tsx`, `MemberEditPage.tsx` | `PATCH /api/v1/members/:id` | `member.controller.updateMember` | `Member` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Activate / Deactivate Member** | `src/pages/MemberDetailPage.tsx` | `PATCH /api/v1/members/:id/status` | `member.controller.updateMemberStatus` | `Member`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Prevent Duplicate Egyptian Phone**| Form validation + Controller | `POST /api/v1/members` | `member.service.createMember` (Unique Check) | `Member` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |

---

## 4. Subscriptions Management Module

| Feature / Capability | Frontend Component / File | Backend Route & Method | Controller & Service | Database Models | Execution Flow Status | Test Status | Production Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **Create Subscription** | `src/components/subscriptions/SubscriptionModal.tsx` | `POST /api/v1/subscriptions` | `subscription.controller.create` $\rightarrow$ `subscription.service.createSubscription` | `Subscription`, `MembershipPlan`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Get Member Subscriptions** | `src/pages/MemberDetailPage.tsx` | `GET /api/v1/members/:memberId/subscriptions` | `subscription.controller.getMemberSubscriptions` | `Subscription`, `MembershipPlan` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Get Subscription Details** | `src/components/subscriptions/SubscriptionDetailsDrawer.tsx` | `GET /api/v1/subscriptions/:id` | `subscription.controller.getById` $\rightarrow$ `subscription.service.getSubscriptionById` | `Subscription`, `Payment`, `SubscriptionFreeze` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Renew Subscription** | `src/components/subscriptions/RenewSubscriptionModal.tsx` | `POST /api/v1/subscriptions/:id/renew` | `subscription.controller.renew` $\rightarrow$ `subscription.service.renewSubscription` | `Subscription`, `MembershipPlan`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Freeze Subscription** | `src/components/subscriptions/FreezeSubscriptionModal.tsx` | `POST /api/v1/subscriptions/:id/freeze` | `subscription.controller.freeze` $\rightarrow$ `subscription.service.freezeSubscription` | `Subscription`, `SubscriptionFreeze`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Cancel Subscription** | `src/components/subscriptions/CancelSubscriptionModal.tsx` | `POST /api/v1/subscriptions/:id/cancel` | `subscription.controller.cancel` $\rightarrow$ `subscription.service.cancelSubscription` | `Subscription`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Dynamic Expiration Calculation** | Subscriptions list & checks | Evaluated dynamically | `subscription.service.getEffectiveSubscriptionStatus` | `Subscription` | API $\rightarrow$ DB | **PASS** | Ready |

---

## 5. Payments & Financial Management Module

| Feature / Capability | Frontend Component / File | Backend Route & Method | Controller & Service | Database Models | Execution Flow Status | Test Status | Production Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **Record Cash Payment** | `src/components/payments/PaymentModal.tsx` | `POST /api/v1/payments` | `payment.controller.createPayment` $\rightarrow$ `payment.service.createPayment` | `Payment`, `Subscription`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Record Mobile Wallet Payment** | `src/components/payments/PaymentModal.tsx` | `POST /api/v1/payments` | `payment.controller.createPayment` | `Payment`, `Subscription`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **List Payments with Filters** | `src/pages/PaymentsPage.tsx` | `GET /api/v1/payments` | `payment.controller.listPayments` $\rightarrow$ `payment.service.listPayments` | `Payment`, `Member`, `Subscription` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Get Payment Details & Receipt**| `src/components/payments/PaymentReceiptModal.tsx` | `GET /api/v1/payments/:id` | `payment.controller.getPayment` $\rightarrow$ `payment.service.getPaymentById` | `Payment`, `Member`, `Subscription`, `User` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Overpayment Prevention (Max Balance Check)** | Backend Validation | `POST /api/v1/payments` | `payment.service.createPayment` (Balance validation) | `Subscription`, `Payment` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Partial Payments Handling** | `src/components/payments/PaymentModal.tsx` | `POST /api/v1/payments` | `payment.service.createPayment` | `Payment`, `Subscription` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |

---

## 6. Attendance & Access Control Module

| Feature / Capability | Frontend Component / File | Backend Route & Method | Controller & Service | Database Models | Execution Flow Status | Test Status | Production Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **Member Check-In** | `src/pages/AttendancePage.tsx` | `POST /api/v1/attendance/check-in` | `attendance.controller.checkIn` $\rightarrow$ `attendance.service.checkInMember` | `Attendance`, `Member`, `Subscription`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Duplicate Check-In Prevention** | Reception Desk UI Feedback | `POST /api/v1/attendance/check-in` | `attendance.service.checkInMember` (409 Conflict) | `Attendance` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Manual Check-Out** | `src/pages/AttendancePage.tsx` | `POST /api/v1/attendance/:id/check-out` | `attendance.controller.checkOut` $\rightarrow$ `attendance.service.checkOutMember` | `Attendance`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Attendance History with Date Filters** | `src/pages/AttendancePage.tsx` | `GET /api/v1/attendance` | `attendance.controller.listAttendance` $\rightarrow$ `attendance.service.listAttendance` | `Attendance`, `Member` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Reject Check-In on Expired/Frozen/Cancelled** | Reception Error Modal | `POST /api/v1/attendance/check-in` | `attendance.service.checkInMember` | `Subscription` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |

---

## 7. Trainers Management Module

| Feature / Capability | Frontend Component / File | Backend Route & Method | Controller & Service | Database Models | Execution Flow Status | Test Status | Production Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **List Trainers** | `src/pages/TrainersPage.tsx` | `GET /api/v1/trainers` | `trainer.controller.getTrainersHandler` $\rightarrow$ `trainer.service.getTrainers` | `Trainer`, `User` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Create Trainer Profile & User** | `src/components/trainers/TrainerCreateModal.tsx` | `POST /api/v1/trainers` | `trainer.controller.createTrainerHandler` $\rightarrow$ `trainer.service.createTrainer` | `User`, `Trainer`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **View Trainer Details** | `src/pages/TrainerDetailPage.tsx` | `GET /api/v1/trainers/:id` | `trainer.controller.getTrainerByIdHandler` $\rightarrow$ `trainer.service.getTrainerById` | `Trainer`, `User` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Toggle Trainer Active Status** | `src/pages/TrainersPage.tsx` | `PATCH /api/v1/trainers/:id/status` | `trainer.controller.updateTrainerStatusHandler` | `User`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Trainer Self Profile Query** | Trainer Dashboard Context | `GET /api/v1/trainers/me` | `trainer.controller.getTrainerMeHandler` | `Trainer`, `User` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |

---

## 8. Membership Plans Module

| Feature / Capability | Frontend Component / File | Backend Route & Method | Controller & Service | Database Models | Execution Flow Status | Test Status | Production Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **List Plans** | `src/pages/PlansPage.tsx` | `GET /api/v1/plans` | `plan.controller.listPlans` $\rightarrow$ `plan.service.listPlans` | `MembershipPlan` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Create Plan** | `src/components/plans/PlanModal.tsx` | `POST /api/v1/plans` | `plan.controller.createPlan` $\rightarrow$ `plan.service.createPlan` | `MembershipPlan`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Update Plan** | `src/components/plans/PlanModal.tsx` | `PATCH /api/v1/plans/:id` | `plan.controller.updatePlan` $\rightarrow$ `plan.service.updatePlan` | `MembershipPlan`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Delete Plan (Unreferenced)** | `src/pages/PlansPage.tsx` | `DELETE /api/v1/plans/:id` | `plan.controller.deletePlan` $\rightarrow$ `plan.service.deletePlan` | `MembershipPlan`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Prevent Deletion if Subscribed** | Delete Plan Action Modal | `DELETE /api/v1/plans/:id` | `plan.service.deletePlan` (409 Conflict) | `Subscription`, `MembershipPlan` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |

---

## 9. Users & Role-Based Access Control Module

| Feature / Capability | Frontend Component / File | Backend Route & Method | Controller & Service | Database Models | Execution Flow Status | Test Status | Production Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **List Staff Users** | `src/pages/UsersPage.tsx` | `GET /api/v1/users` | `user.controller.getUsers` $\rightarrow$ `user.service.getUsers` | `User` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Create Staff User** | `src/components/users/UserModal.tsx` | `POST /api/v1/users` | `user.controller.createUser` $\rightarrow$ `user.service.createUser` | `User`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Toggle User Status** | `src/pages/UsersPage.tsx` | `PATCH /api/v1/users/:id/status` | `user.controller.updateUserStatus` | `User`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Role Hierarchy Enforcement** | Global Middleware | RBAC Middleware | `middlewares/rbac.middleware.ts` | `User` | API Guard | **PASS** | Ready |

---

## 10. Reports & Analytics Module

| Feature / Capability | Frontend Component / File | Backend Route & Method | Controller & Service | Database Models | Execution Flow Status | Test Status | Production Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **Reports Summary Overview** | `src/pages/ReportsPage.tsx` | `GET /api/v1/reports/summary` | `report.controller.getSummary` $\rightarrow$ `report.service.getReportsSummary` | All Core Models | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Financial Payments Report** | `src/pages/ReportsPage.tsx` | `GET /api/v1/reports/payments` | `report.controller.getPayments` $\rightarrow$ `report.service.getPaymentsReport` | `Payment` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Members Growth Report** | `src/pages/ReportsPage.tsx` | `GET /api/v1/reports/members` | `report.controller.getMembers` $\rightarrow$ `report.service.getMembersReport` | `Member` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Subscriptions Report** | `src/pages/ReportsPage.tsx` | `GET /api/v1/reports/subscriptions` | `report.controller.getSubscriptions` $\rightarrow$ `report.service.getSubscriptionsReport` | `Subscription` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Attendance Report** | `src/pages/ReportsPage.tsx` | `GET /api/v1/reports/attendance` | `report.controller.getAttendance` $\rightarrow$ `report.service.getAttendanceReport` | `Attendance` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |

---

## 11. Data Exports Module

| Feature / Capability | Frontend Component / File | Backend Route & Method | Controller & Service | Database Models | Execution Flow Status | Test Status | Production Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **Export Members (Excel/CSV)** | `src/pages/MembersPage.tsx` | `GET /api/v1/exports/members` | `export.controller.exportMembers` $\rightarrow$ `export.service` | `Member` | UI $\rightarrow$ API $\rightarrow$ Stream | **PASS** | Ready |
| **Export Subscriptions (Excel/CSV)**| `src/pages/SubscriptionsPage.tsx` | `GET /api/v1/exports/subscriptions` | `export.controller.exportSubscriptions` $\rightarrow$ `export.service` | `Subscription` | UI $\rightarrow$ API $\rightarrow$ Stream | **PASS** | Ready |
| **Export Payments (Excel/CSV)** | `src/pages/PaymentsPage.tsx` | `GET /api/v1/exports/payments` | `export.controller.exportPayments` $\rightarrow$ `export.service` | `Payment` | UI $\rightarrow$ API $\rightarrow$ Stream | **PASS** | Ready |

---

## 12. Notifications Module

| Feature / Capability | Frontend Component / File | Backend Route & Method | Controller & Service | Database Models | Execution Flow Status | Test Status | Production Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **List User Notifications** | `src/components/notifications/NotificationDropdown.tsx` | `GET /api/v1/notifications` | `notification.controller.listNotifications` | `Notification` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Mark Notification as Read** | `src/components/notifications/NotificationDropdown.tsx` | `PATCH /api/v1/notifications/:id/read` | `notification.controller.markAsRead` | `Notification` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Mark All Notifications Read** | `src/components/notifications/NotificationDropdown.tsx` | `PATCH /api/v1/notifications/read-all` | `notification.controller.markAllRead` | `Notification` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |

---

## 13. Gym Settings & Activity Logs Module

| Feature / Capability | Frontend Component / File | Backend Route & Method | Controller & Service | Database Models | Execution Flow Status | Test Status | Production Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **Get Gym Profile & Settings** | `src/pages/SettingsPage.tsx` | `GET /api/v1/gym` | `gym.controller.getSettings` | `Gym` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **Update Gym Profile & Settings**| `src/pages/SettingsPage.tsx` | `PATCH /api/v1/gym` | `gym.controller.updateSettings` | `Gym`, `AuditLog` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
| **List Activity Logs with Filters**| `src/pages/ActivityLogsPage.tsx` | `GET /api/v1/activity-logs` | `audit.controller.getAuditLogs` $\rightarrow$ `audit.service` | `AuditLog`, `User` | UI $\rightarrow$ API $\rightarrow$ DB | **PASS** | Ready |
