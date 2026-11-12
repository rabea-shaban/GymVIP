# 🏋️‍♂️ GymVIP SaaS - Backend

> **GymVIP** هو نظام سحابي متكامل واحترافي لإدارة الصالات الرياضية ومراكز اللياقة البدنية (Gym Management SaaS)، مصمم بالكامل للسوق المصري باللغة العربية والجنيه المصري (`ج.م`).

---

## 📌 1. نظرة عامة على المشروع (Project Overview)

يوفر هذا المجلد الـ Backend الخاص بمنظومة **GymVIP** مبنياً بأحدث التقنيات وأفضل الممارسات البرمجية:
- **معمارية متعددة الطبقات (Layered Architecture):** Controllers, Services, Routes, Middlewares, Utilities, Config, Validators.
- **الأمان والخصوصية (Production-Ready Security):**
  - مصادقة عبر كوكيز مشفرة ومحمية (`HTTPOnly Cookies`).
  - تشفير كلمات المرور باستخدام `bcrypt` (10 Salt Rounds).
  - توكنات JWT مشفرة تحتوي فقط على بيانات الهوية الدنيا (`sub`, `gymId`, `role`).
  - حماية الترويسات عبر `Helmet` وضبط `CORS` محدد للموقع مع دعم `credentials: true`.
- **عزل بيانات الصالات الرياضية (Multi-tenant Gym Isolation):**
  - ربط كل مستخدم بصالته الرياضية (`gymId`) حصراً لضمان عزل البيانات ومنع تداخل الحسابات.
- **إدارة الصلاحيات (Role-Based Access Control - RBAC):**
  - أدوار النظام الأربعة المعتمدة: `OWNER`, `MANAGER`, `RECEPTIONIST`, `TRAINER`.
- **التحقق الصارم من المدخلات (Zod Validation):** التحقق من صيغة البريد، كلمة المرور، وأرقام الهواتف المصرية (`010`, `011`, `012`, `015`).

---

## 🛠️ 2. المتطلبات الأساسية (Requirements)

- **Node.js**: الإصدار `18.x` أو أعلى (يوصى بـ `v20+` أو `v24+`).
- **npm**: الإصدار `9.x` أو أعلى.
- **MySQL Database Server**: الإصدار `8.0+` أو MariaDB.

---

## 📦 3. التثبيت والتهيئة (Installation)

1. انتقل إلى مجلد الـ Backend:
```bash
cd Backend
```

2. قم بتثبيت حزم الـ NPM:
```bash
npm install
```

---

## ⚙️ 4. ضبط متغيرات البيئة (Environment Setup)

قم بنسخ ملف `.env.example` إلى `.env`:

```bash
# في نظام Windows (PowerShell / CMD):
copy .env.example .env

# أو في Linux / macOS:
cp .env.example .env
```

محتوى ملف `.env`:
```env
NODE_ENV=development
PORT=5000

# رابط الاتصال بقاعدة بيانات MySQL
DATABASE_URL="mysql://root:password@localhost:3306/gymvip"

# مفاتيح التشفير والمصادقة
JWT_SECRET="gymvip_super_secure_jwt_secret_key_2025"
JWT_EXPIRES_IN="7d"

# رابط الواجهة الأمامية المسموح له بـ CORS
FRONTEND_URL="http://localhost:5173"
```

---

## 🗄️ 5. إعداد قاعدة البيانات ونماذج Prisma (Database Models)

تأكد من تشغيل خادم MySQL وإنشاء قاعدة البيانات:
```sql
CREATE DATABASE IF NOT EXISTS gymvip CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### نماذج Prisma المتاحة:
- **`Gym`**: يمثل النادي الرياضي المستأجر في النظام (`id`, `name`, `slug`, `email`, `phone`, `city`, `currency`, `timezone`, `isActive`).
- **`User`**: يمثل المستخدمين والموظفين والمدربين والمالكين (`id`, `gymId`, `name`, `email`, `phone`, `passwordHash`, `role`, `isActive`, `lastLoginAt`).
- **`Role`**: تعداد الصلاحيات (`OWNER`, `MANAGER`, `RECEPTIONIST`, `TRAINER`).
- **`SystemHealth`**: نموذج فحص اتصال وصحة قاعدة البيانات.

---

## ⚡ 6. إعداد وتوليد Prisma (Prisma Setup)

1. توليد عميل Prisma Client:
```bash
npm run prisma:generate
```

2. تشغيل الترحيلات (Migrations) على قاعدة البيانات:
```bash
npm run prisma:migrate
```

3. فتح لوحة تحكم Prisma Studio (اختياري لمعاينة الجداول):
```bash
npm run prisma:studio
```

---

## 🚀 7. التشغيل في وضع التطوير (Development)

لتشغيل السيرفر مع إعادة التحميل اللحظية (Hot-Reloading باستخدام `tsx`):
```bash
npm run dev
```
سيعمل السيرفر افتراضياً على: `http://localhost:5000`

---

## 🏗️ 8. بناء بيئة الإنتاج والتشغيل (Production Build)

1. فحص توافق TypeScript:
```bash
npm run typecheck
```

2. بناء المشروع إلى ملفات JavaScript (`dist`):
```bash
npm run build
```

3. تشغيل كود الإنتاج المبني:
```bash
npm run start
```

---

## 📡 9. وثائق مسارات الـ API (API Endpoints Documentation)

جميع مسارات الـ API تبدأ بالبادئة: `/api/v1`

### 🟢 أولاً: مسارات المصادقة والحسابات (`/api/v1/auth`)

| الطريقة (Method) | المسار (Endpoint) | الصلاحية المطلوبة | الوصف |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | عام (Public) | إنشاء حساب الجيم الرياضي وحساب المالك (OWNER) داخل Transaction وتعيين Cookie الدخول |
| `POST` | `/api/v1/auth/login` | عام (Public) | تسجيل الدخول، التحقق من كلمة المرور ونشاط الحساب، وتعيين Cookie الجلسة |
| `POST` | `/api/v1/auth/logout` | عام (Public) | تسجيل الخروج ومسح كوكيز المصادقة (`gymvip_token`) |
| `GET` | `/api/v1/auth/me` | مسجل دخول (`requireAuth`) | جلب بيانات المستخدم والنادي الحالي بشكل آمن بدون بيانات حساسة |

#### مثال على تسجيل جيم جديد (`POST /api/v1/auth/register`):
**الطلب (Request):**
```json
{
  "gymName": "GymVIP Fitness Club",
  "ownerName": "أحمد محمد",
  "email": "owner@gymvip.eg",
  "phone": "01012345678",
  "password": "StrongPassword123!",
  "city": "المنيا"
}
```
**الاستجابة (Response 201 Created):**
```json
{
  "success": true,
  "message": "تم إنشاء حساب النادي الرياضي والمالك بنجاح / Gym and owner created successfully",
  "data": {
    "user": {
      "id": "c1f7b8...",
      "name": "أحمد محمد",
      "email": "owner@gymvip.eg",
      "phone": "01012345678",
      "role": "OWNER"
    },
    "gym": {
      "id": "a9e2d1...",
      "name": "GymVIP Fitness Club",
      "slug": "gymvip-fitness-club-4f2a",
      "city": "المنيا",
      "currency": "EGP"
    }
  }
}
```

---

### 🟢 ثانياً: مسارات إعدادات وبيانات النادي الرياضي (`/api/v1/gym`)

| الطريقة (Method) | المسار (Endpoint) | الصلاحية المطلوبة (RBAC) | الوصف |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/gym` | موظفون (`OWNER`, `MANAGER`, `RECEPTIONIST`, `TRAINER`) | جلب الملف الكامل للنادي الرياضي الموثق |
| `GET` | `/api/v1/gym/setup-status` | موظفون (`OWNER`, `MANAGER`, `RECEPTIONIST`, `TRAINER`) | جلب حالة اكتمال الإعداد الأولي (`setupCompleted`) |
| `PATCH` | `/api/v1/gym/setup` | `OWNER`, `MANAGER` | إكمال الإعداد الأولي وتعيين `setupCompleted = true` |
| `PATCH` | `/api/v1/gym` | `OWNER`, `MANAGER` | تحديث بيانات وإعدادات النادي (الاسم، الهاتف، البريد، العنوان، الشعار) |
| `PATCH` | `/api/v1/gym/status` | `OWNER` حصراً | تفعيل أو تعطيل اشتراك/نشاط النادي الرياضي (`isActive`) |

---

### 🟢 ثالثاً: مسارات إدارة الموظفين والمستخدمين (`/api/v1/users`)

| الطريقة (Method) | المسار (Endpoint) | الصلاحية المطلوبة (RBAC) | الوصف |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users` | `OWNER`, `MANAGER` | استعراض طاقم عمل النادي مع الفلترة والبحث والترقيم |
| `GET` | `/api/v1/users/:id` | `OWNER`, `MANAGER` | جلب تفاصيل مستخدم محدد مع ضمان العزل التام للجيم |
| `POST` | `/api/v1/users` | `OWNER`, `MANAGER` | إنشاء مستخدم جديد (المالك ينشئ أي رتبة، المدير ينشئ موظف استقبال ومدرب) |
| `PATCH` | `/api/v1/users/:id` | `OWNER`, `MANAGER` | تعديل بيانات ورتبة المستخدم ضمن الحدود المصرح بها |
| `PATCH` | `/api/v1/users/:id/status` | `OWNER`, `MANAGER` | تفعيل أو تعطيل حساب المستخدم (مع حظر تعطيل الذات أو تعطيل المالك) |
| `PATCH` | `/api/v1/users/:id/password` | `OWNER`, `MANAGER` | إعادة تعيين كلمة مرور موظف بواسطة الإدارة |

---

### 🟢 رابعاً: مسارات إدارة الأعضاء والمشتركين (`/api/v1/members`)

| الطريقة (Method) | المسار (Endpoint) | الصلاحية المطلوبة (RBAC) | الوصف |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/members` | `OWNER`, `MANAGER`, `RECEPTIONIST`, `TRAINER` | استعراض قائمة المشتركين مع البحث الذكي وفلاتر الحالة والنوع والترقيم |
| `GET` | `/api/v1/members/:id` | `OWNER`, `MANAGER`, `RECEPTIONIST`, `TRAINER` | جلب الملف الرياضي والشخصي الكامل للعضو مع عزل الجيم |
| `POST` | `/api/v1/members` | `OWNER`, `MANAGER`, `RECEPTIONIST` | إضافة عضو جديد وتوليد كود العضوية الآمن تلقائياً (`GYM-XXXXXX`) |
| `PATCH` | `/api/v1/members/:id` | `OWNER`, `MANAGER`, `RECEPTIONIST` | تعديل البيانات الشخصية والتواصل وحالات الطوارئ للعضو |
| `PATCH` | `/api/v1/members/:id/status` | `OWNER`, `MANAGER`, `RECEPTIONIST` | تفعيل أو تعطيل العضوية (مع حظر الحذف الفيزيائي لحماية السجلات) |

---

### 🟢 خامساً: مسارات فحص الصحة (`/api/v1/health`)

| الطريقة (Method) | المسار (Endpoint) | الاستجابة المتوقعة |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | `200 OK` تعيد حالة تشغيل السيرفر والبيئة |
| `GET` | `/api/v1/health/database` | `200 OK` في حال جاهزية MySQL، أو `503 Service Unavailable` في حال الانقطاع |

---

## 🧪 10. تشغيل الاختبارات الآلية (Automated Tests)

لتشغيل حزمة الاختبارات الآلية الشاملة (Vitest + Supertest):
```bash
npm run test
```

---

## 📁 هيكلية مجلدات المشروع (Project Structure)

```text
Backend/
├── prisma/
│   └── schema.prisma         # مخطط Prisma (Gym, User, Role enum, SystemHealth)
├── src/
│   ├── config/
│   │   ├── database.ts       # اتصال Prisma Singleton والتخلص السليم من الاتصالات
│   │   └── env.ts            # التحقق الصارم من متغيرات البيئة عبر Zod
│   ├── controllers/
│   │   ├── auth.controller.ts   # متحكمات التسجيل والدخول والخروج و /auth/me
│   │   └── health.controller.ts # متحكمات فحص الصحة العامة والـ DB
│   ├── middlewares/
│   │   ├── auth.middleware.ts   # وسيط التحقق من التوكن وجاهزية الحساب (requireAuth)
│   │   ├── error.middleware.ts  # معالج الأخطاء المركزي الموحد
│   │   ├── notFound.middleware.ts # معالج المسارات غير الموجودة (404)
│   │   ├── rbac.middleware.ts   # وسيط حراسة الصلاحيات والأدوار (requireRole)
│   │   └── validate.middleware.ts # وسيط التحقق من الـ Body عبر Zod
│   ├── routes/
│   │   ├── auth.routes.ts    # مسارات المصادقة
│   │   ├── health.routes.ts  # مسارات فحص الصحة
│   │   └── index.ts          # مجمع المسارات الرئيسي تحت /api/v1
│   ├── services/
│   │   ├── auth.service.ts   # منطق إنشاء الجيم والمالك، التحقق وتوليد JWT
│   │   └── health.service.ts # منطق فحص الجاهزية واتصال DB
│   ├── types/
│   │   ├── api.types.ts      # تعريفات ApiResponse
│   │   ├── auth.types.ts     # تعريفات AuthUser, SafeUser, SafeGym
│   │   ├── express.d.ts      # توسيع Express.Request بإضافة req.user
│   │   └── index.ts
│   ├── utils/
│   │   ├── appError.util.ts  # كلاس مخصص للأخطاء التشغيلية
│   │   ├── cookie.util.ts    # أدوات ضبط ومسح كوكيز HTTPOnly
│   │   ├── jwt.util.ts       # توليد وفحص JWT
│   │   ├── logger.util.ts    # نظام تسجيل السجلات المنظم
│   │   ├── password.util.ts  # تشفير ومقارنة كلمات المرور عبر bcrypt
│   │   ├── response.util.ts  # أدوات إرسال الاستجابات الموحدة (Success / Error)
│   │   └── slug.util.ts      # توليد أسماء النطاقات الفريدة (Gym Slug)
│   ├── validators/
│   │   └── auth.validator.ts # مخططات Zod للتسجيل والدخول وأرقام الهواتف المصرية
│   ├── app.ts                # إعداد Express, CookieParser, Helmet, CORS
│   └── server.ts             # نقطة بدء السيرفر والإيقاف السلس (Graceful Shutdown)
├── tests/
│   ├── auth.test.ts          # اختبارات المصادقة الشاملة، الـ RBAC، وعزل الجيمات
│   └── health.test.ts        # اختبارات فحص الصحة العامة والـ DB والـ 404
├── .env.example              # نموذج متغيرات البيئة
├── .env                      # متغيرات البيئة المحلية
├── package.json              # الحزم وسكربتات التشغيل
├── tsconfig.json             # ضبط TypeScript الصارم
└── README.md                 # دليل التوثيق والتشغيل
```
