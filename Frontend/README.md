# GymVIP - نظام إدارة وتشغيل الصالات الرياضية 🏋️‍♂️👑

الواجهة الأمامية لنظام إدارة الصالات الرياضية **GymVIP** الموجه للسوق المصري، مبني باستخدام أحدث تقنيات الويب بتصميم عربي بالكامل (RTL) وهوية مميزة باللونين الأسود والذهبي.

## 🚀 التقنيات المستخدمة (Tech Stack)

- **React 19** + **Vite** + **TypeScript (Strict Mode)**
- **Tailwind CSS** مع تخصيص درجات ألوان GymVIP وخط **Cairo** العربي
- **React Router DOM v7** (هيكلة توجيه كاملة للمسارات العامة والمحمية)
- **TanStack React Query v5**
- **Axios** (معد ومهيأ للربط المستقبلي مع Interceptors و CORS)
- **React Hook Form** + **Zod**
- **Lucide React** (أيقونات متناسقة ومهيأة للاتجاه RTL)

---

## 🎨 نظام الألوان والهوية البصرية (Brand Identity)

- **Primary Black:** `#0B0B0B`
- **Primary Gold:** `#D4AF37`
- **Light Gold:** `#F4D76A`
- **Card Dark:** `#141414`
- **Background:** `#F8F8F8`
- **Main Text:** `#18181B`
- **Muted Text:** `#71717A`
- **Success:** `#16A34A`
- **Warning:** `#F59E0B`
- **Error:** `#DC2626`
- **Currency:** `ج.م` (الجنيه المصري)
- **Payment Methods (V1):** نقدي (كاش) / محفظة إلكترونية (فودافون كاش / إنستاباي / أخرى)

---

## 📁 هيكل المشروع (Project Structure)

```
src/
├── app/
│   ├── config/             # QueryClient & App configurations
│   ├── providers/          # AppProviders, QueryProvider
│   └── router/             # routes.tsx, AppRouter
├── assets/                 # SVGs and static brand assets
├── components/
│   ├── feedback/           # Toast notification system, ErrorBoundary
│   ├── layout/             # AppLayout, Sidebar, Header, QuickActions, PageHeader
│   └── ui/                 # 20+ Reusable base UI components
├── features/
│   ├── auth/               # AuthProvider, ProtectedRoute, GuestRoute, Login, Register
│   ├── dashboard/          # DashboardPage (KPI overview, quick access)
│   ├── members/            # MembersListPage, MemberCreatePage, MemberDetailPage
│   ├── subscriptions/      # Subscriptions & Membership Plans
│   ├── payments/           # Cash & E-Wallet Payments log & entry
│   ├── attendance/         # Attendance tracking & quick barcode/phone check-in
│   ├── trainers/           # Trainers management & specializations
│   ├── reports/            # Financial & Operational Reports
│   ├── notifications/      # System notifications center
│   ├── users/              # RBAC & Staff activity logs
│   └── settings/           # Gym settings & Profile
├── hooks/                  # Custom React hooks (useAuth, etc.)
├── lib/                    # Utilities (cn, formatCurrency, formatDate, formatEgyptianPhone)
├── services/               # Centralized Axios API instance (api.ts)
├── types/                  # Global TypeScript definitions & Enums
└── pages/
    └── errors/             # 404, 403, 500 pages
```

---

## 💻 التشغيل والتطوير (Getting Started)

### 1. تثبيت الحزم
```bash
npm install
```

### 2. تشغيل السيرفر المحلي
```bash
npm run dev
```

### 3. فحص الأنواع (Type Checking)
```bash
npm run lint
```

### 4. بناء نسخة الإنتاج (Production Build)
```bash
npm run build
```
