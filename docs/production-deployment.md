# GymVIP — دليل النشر والتشغيل في بيئة الإنتاج (Production Deployment Guide)

يوثق هذا المستند متطلبات وخطوات نشر وتشغيل منصة **GymVIP SaaS** في بيئة الإنتاج بأعلى معايير الأمان والاستقرار والأداء.

---

## 1. المتغيرات البيئية (Environment Variables)

### أ. خادم الواجهة الخلفية (Backend)

أنشئ ملف `.env` في مجلد `Backend/` بالقرب من كود الخادم:

| المتغير | الوصف | مثال لقيمة الإنتاج |
|---|---|---|
| `NODE_ENV` | بيئة التشغيل (يجب أن تكون `production`) | `production` |
| `PORT` | منفذ تشغيل خدمة الـ API | `5000` |
| `DATABASE_URL` | رابط الاتصال بقاعدة بيانات MySQL المشفرة | `mysql://gymvip_prod:SecretPass123!@127.0.0.1:3306/gymvip` |
| `JWT_SECRET` | مفتاح توقيع رموز JWT (16 حرفاً على الأقل، عشوائي وآمن) | `a8f9c1e09b3d4f828a1c9e884b2f1e67` |
| `JWT_EXPIRES_IN` | صلاحية جلسة تسجيل الدخول | `7d` |
| `FRONTEND_URL` | الرابط الأساسي لواجهة الويب المعتمدة | `https://app.gymvip.eg` |
| `ALLOWED_ORIGINS` | قائمة النطاقات المسموح لها بتبادل البيانات عبر CORS (مفصولة بفاصلة) | `https://app.gymvip.eg,https://gymvip.eg` |

> ⚠️ **تنبيه أمني:**
> - يُمنع منعاً باتاً رفع ملف `.env` إلى مستودع الكود (Git).
> - يتوقف الخادم فوراً (`fail-fast`) عند الإقلاع إذا كان `JWT_SECRET` قصيراً أو يستخدم كلمات افتراضية ضعيفة في وضع الـ production.

---

### ب. الواجهة الأمامية (Frontend)

أنشئ ملف `.env.production` في مجلد `Frontend/`:

| المتغير | الوصف | مثال لقيمة الإنتاج |
|---|---|---|
| `VITE_API_URL` | الرابط العام لنقاط نهاية الـ API | `https://api.gymvip.eg/api/v1` |

> ⚠️ **ملاحظة:** لا تضع أي مفاتيح سرية في ملفات الفرونت إند؛ حيث يتم تضمين كافة متغيرات `VITE_*` في ملفات الجافاسكربت العامة المنشورة للمتصفح.

---

## 2. إعداد قاعدة البيانات وتطبيق التهجيرات (Database & Migrations)

1. أنشئ قاعدة بيانات MySQL مع دعم محارف التشفير العربية `utf8mb4`:
```sql
CREATE DATABASE gymvip CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gymvip_prod'@'localhost' IDENTIFIED BY 'STRONG_COMPLEX_PASSWORD';
GRANT ALL PRIVILEGES ON gymvip.* TO 'gymvip_prod'@'localhost';
FLUSH PRIVILEGES;
```

2. تطبيق تهجيرات Prisma الإنتاجية (بدون أوامر تطويرية هدامة):
```bash
cd Backend
npx prisma migrate deploy
npx prisma generate
```

---

## 3. بناء ونشر التطبيق (Build & Startup)

### أ. بناء الخادم (Backend):
```bash
cd Backend
npm ci --omit=dev
npm run build
npm start
# أو تشغيله باستخدام PM2 لإدارة العمليات:
pm2 start dist/server.js --name "gymvip-api" -i max
```

### ب. بناء الفرونت إند (Frontend):
```bash
cd Frontend
npm ci
npm run build
# يتم توليد الملفات الثابتة في مجلد `Frontend/dist`
```

---

## 4. إعداد خادم الويب العكسي (Nginx Reverse Proxy) وشهادة SSL

نموذج إعداد Nginx يدعم:
- شهادة SSL مجانية (Let's Encrypt).
- إرسال ترويسات الأمان (HSTS, X-Content-Type-Options, Frame Options).
- توجيه الـ Cookies بأمان (`SameSite=Lax; Secure`).
- توجيه طلبات الواجهة الخلفية إلى `http://127.0.0.1:5000`.

```nginx
# 1. API Backend Server
server {
    listen 443 ssl http2;
    server_name api.gymvip.eg;

    ssl_certificate /etc/letsencrypt/live/api.gymvip.eg/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.gymvip.eg/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# 2. Frontend SPA Server
server {
    listen 443 ssl http2;
    server_name app.gymvip.eg;

    ssl_certificate /etc/letsencrypt/live/app.gymvip.eg/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.gymvip.eg/privkey.pem;

    root /var/www/gymvip/Frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 5. فحص الجاهزية والسلامة (Health Checks)

يوفر خادم GymVIP مسارات صحية عامة وخفيفة دون تسريب أي أسرار عن البنية التحتية:
- **سلامة الخادم العام:**
  `GET https://api.gymvip.eg/api/v1/health`
  الاستجابة المتوقعة: `200 OK` مع `{"success": true, "data": {"environment": "production"}}`.
- **سلامة اتصال قاعدة البيانات:**
  `GET https://api.gymvip.eg/api/v1/health/database`
  الاستجابة المتوقعة: `200 OK` عند نجاح الاتصال بـ MySQL، أو `503 Service Unavailable` في حال انقطاع الاتصال.

---

## 6. قائمة الفحص اليدوي بعد النشر (Production Smoke Test Checklist)

1. [ ] التحقق من استجابة `GET /api/v1/health` بنجاح (200).
2. [ ] التحقق من استجابة `GET /api/v1/health/database` بنجاح (200).
3. [ ] تجربة تسجيل حساب نادٍ ومالك جديد بنجاح من شاشة `/register`.
4. [ ] تجربة تسجيل الدخول والتأكد من إرسال كوكي الجلسة `gymvip_token` بخاصية `HTTPOnly; Secure`.
5. [ ] التأكد من رفض تسجيل الدخول بكلمة مرور خاطئة ومراجعة سجل التدقيق `AuditLog`.
6. [ ] إكمال معالج إعداد النادي (`/setup`).
7. [ ] إنشاء عضو جديد والتأكد من توليد كود العضوية الآلي.
8. [ ] إنشاء باقة اشتراك جديدة وتعديل حالتها.
9. [ ] إنشاء اشتراك جديد لعضو نشط واختبار تسجيل دفعة نقدية ومحفظة إلكترونية.
10. [ ] التأكد من رفض تسديد مبالغ أكبر من المتبقي على الاشتراك (`Overpayment Prevention`).
11. [ ] تسجيل حضور عضو وانصرافه بنجاح، والتأكد من منع الدخول المزدوج المفتوح.
12. [ ] اختبار تجميد اشتراك وتمديد تاريخ الانتهاء تلقائياً.
13. [ ] اختبار تجديد اشتراك والتأكد من إنشاء سجل اشتراك جديد مع الاحتفاظ بالأصل.
14. [ ] تجربة إلغاء اشتراك والتأكد من حظر تجديده مباشرة.
15. [ ] تحميل تقرير وتصدير Excel/CSV والتأكد من فتح الملف بترميز RTL ومنع حقن الصيغ.
16. [ ] التأكد من رفض الوصول المتبادل بين أندية مختلفة (`Cross-Gym Isolation`).
17. [ ] التحقق من تسجيل الخروج وحذف الكوكي وتوجيه المستخدم لشاشة تسجيل الدخول.

---

## 7. سياسة التراجع في حالات الطوارئ (Rollback Procedure)

في حال حدوث خطأ غير متوقع أثناء النشر:
1. إيقاف عملية الخادم: `pm2 stop gymvip-api`
2. إعادة تعيين الفرع أو الكود للإصدار السابق المستقر (`git checkout <previous-tag>`).
3. إعادة بناء وتشغيل الخادم: `npm run build && pm2 restart gymvip-api`.
4. استرجاع أحدث نسخة احتياطية من قاعدة البيانات وفق الدليل الموجود في [`docs/backup-and-restore.md`](file:///d:/GymVIP/docs/backup-and-restore.md).
