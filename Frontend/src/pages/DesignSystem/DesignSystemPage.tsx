import React, { useState } from 'react'
import {
  Crown,
  Users,
  CreditCard,
  CalendarCheck,
  Award,
  Bell,
  Plus,
  Edit,
  MoreVertical,
  Download,
  Flame,
  Layers,
} from 'lucide-react'
import {
  Button,
  Input,
  PasswordInput,
  NumberInput,
  DateInput,
  SearchInput,
  Select,
  Textarea,
  Checkbox,
  RadioGroup,
  Switch,
  Toggle,
  FileUpload,
  OTPInput,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatCard,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableSkeleton,
  Modal,
  ConfirmationModal,
  DangerConfirmationModal,
  Drawer,
  Dropdown,
  ContextMenu,
  Tabs,
  Alert,
  Spinner,
  ButtonLoader,
  CardSkeleton,
  EmptyState,
  Avatar,
  AvatarGroup,
  Tooltip,
  Pagination,
  GlobalSearch,
  Icon,
} from '@/components/ui'
import { useToast } from '@/components/feedback/Toast'

export const DesignSystemPage: React.FC = () => {
  const toast = useToast()

  // State management for interactive demos
  const [activeTab, setActiveTab] = useState('buttons')
  const [toggleState, setToggleState] = useState(false)
  const [switchState, setSwitchState] = useState(true)
  const [checkboxState, setCheckboxState] = useState(true)
  const [radioState, setRadioState] = useState('MONTHLY')
  const [otpValue, setOtpValue] = useState('1234')
  const [currentPage, setCurrentPage] = useState(1)
  const [searchValue, setSearchValue] = useState('')
  const [numberVal, setNumberVal] = useState(500)

  // Modals & Drawers state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isDangerOpen, setIsDangerOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Table selection demo
  const [selectedRows, setSelectedRows] = useState<string[]>(['1'])

  const toggleRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  const sampleMembers = [
    {
      id: '1',
      name: 'أحمد محمود إبراهيم',
      phone: '01012345678',
      plan: 'باقة VIP السنوية',
      status: 'active' as const,
      payment: 'paid' as const,
      amount: '4,500 ج.م',
    },
    {
      id: '2',
      name: 'محمد عبد الله الشناوي',
      phone: '01298765432',
      plan: 'اشتراك 3 شهور كمال أجسام',
      status: 'pending' as const,
      payment: 'partial' as const,
      amount: '1,200 ج.م',
    },
    {
      id: '3',
      name: 'كريم عادل يوسف',
      phone: '01155443322',
      plan: 'اشتراك شهري (لياقة)',
      status: 'frozen' as const,
      payment: 'paid' as const,
      amount: '600 ج.م',
    },
    {
      id: '4',
      name: 'طارق حسام الدين',
      phone: '01588776655',
      plan: 'باقة شهرية',
      status: 'expired' as const,
      payment: 'unpaid' as const,
      amount: '500 ج.م',
    },
  ]

  const navTabs = [
    { id: 'colors', label: 'الألوان والرموز' },
    { id: 'typography', label: 'الخطوط والطباعة' },
    { id: 'buttons', label: 'الأزرار' },
    { id: 'inputs', label: 'حقول الإدخال' },
    { id: 'forms', label: 'النماذج والمتحكمات' },
    { id: 'cards', label: 'البطاقات والمؤشرات' },
    { id: 'badges', label: 'الشارات والحالات' },
    { id: 'tables', label: 'الجداول التفاعلية' },
    { id: 'overlays', label: 'النوافذ والدرج' },
    { id: 'navigation', label: 'القوائم والتبويبات' },
    { id: 'feedback', label: 'التنبيهات والإشعارات' },
    { id: 'loading', label: 'التحميل والحالات الفارغة' },
    { id: 'tokens', label: 'المسافات والظلال' },
  ]

  return (
    <div className="min-h-screen bg-gym-background text-gym-text font-body p-4 sm:p-8 space-y-10 max-w-7xl mx-auto selection:bg-gym-primary selection:text-gym-black" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gym-black rounded-2xl p-6 sm:p-10 text-white shadow-xl border border-zinc-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gym-primary/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-gym-primary to-amber-600 flex items-center justify-center shadow-gold shrink-0">
              <Crown className="w-9 h-9 text-gym-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black font-cairo tracking-wide">
                  Gym<span className="text-gym-primary">VIP</span>
                </h1>
                <Badge variant="gold" size="sm" className="font-bold">
                  Design System v1.0
                </Badge>
              </div>
              <p className="text-sm text-zinc-400 mt-1 font-body">
                نظام التصميم العربي المتكامل لمنصة إدارة وتشغيل الصالات الرياضية في مصر
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <Button
              variant="gold"
              size="md"
              startIcon={<Bell className="w-4 h-4 text-gym-black" />}
              onClick={() => toast.success('GymVIP Design System', 'تم تفعيل وتوثيق كافة المكونات بنجاح')}
            >
              اختبار الإشعار
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Sticky Bar */}
      <div className="sticky top-4 z-40 bg-white/95 backdrop-blur-md p-2 rounded-xl border border-gym-border shadow-md">
        <Tabs
          tabs={navTabs}
          activeTab={activeTab}
          onChange={(tab) => {
            setActiveTab(tab)
            const el = document.getElementById(tab)
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          variant="pills"
        />
      </div>

      {/* 1. Colors & Tokens */}
      <section id="colors" className="space-y-4 pt-6">
        <div className="border-b border-gym-border pb-2">
          <h2 className="text-headline-md text-gym-text">1. نظام الألوان (Color System)</h2>
          <p className="text-body-sm text-gym-text-muted">الرموز اللونية المعتمدة بتنسيق CSS Variables و Tailwind Tokens</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-lg bg-gym-black text-white border border-zinc-800 shadow-sm flex flex-col justify-between h-28">
            <span className="text-xs font-bold font-cairo">Primary Black</span>
            <span className="text-[11px] font-mono text-zinc-400">#0B0B0B</span>
          </div>

          <div className="p-4 rounded-lg bg-gym-primary text-gym-black border border-amber-300 shadow-sm flex flex-col justify-between h-28 font-bold">
            <span className="text-xs font-cairo">Primary Gold</span>
            <span className="text-[11px] font-mono">#D4AF37</span>
          </div>

          <div className="p-4 rounded-lg bg-gym-primary-light text-gym-black border border-amber-200 shadow-sm flex flex-col justify-between h-28 font-bold">
            <span className="text-xs font-cairo">Light Gold</span>
            <span className="text-[11px] font-mono">#F4D76A</span>
          </div>

          <div className="p-4 rounded-lg bg-white text-gym-text border border-gym-border shadow-sm flex flex-col justify-between h-28">
            <span className="text-xs font-bold font-cairo">Surface White</span>
            <span className="text-[11px] font-mono text-gym-text-muted">#FFFFFF</span>
          </div>

          <div className="p-4 rounded-lg bg-gym-background text-gym-text border border-gym-border shadow-sm flex flex-col justify-between h-28">
            <span className="text-xs font-bold font-cairo">App Canvas</span>
            <span className="text-[11px] font-mono text-gym-text-muted">#F8F8F8</span>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900 text-gym-primary border border-zinc-700 shadow-sm flex flex-col justify-between h-28">
            <span className="text-xs font-bold font-cairo">Card Dark</span>
            <span className="text-[11px] font-mono text-zinc-400">#141414</span>
          </div>
        </div>

        {/* Semantic Status Colors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-lg bg-gym-success-bg border border-emerald-200 text-gym-success-text flex items-center justify-between">
            <span className="text-xs font-bold">Success (#16A34A)</span>
            <span className="w-3 h-3 rounded-full bg-gym-success" />
          </div>
          <div className="p-3.5 rounded-lg bg-gym-warning-bg border border-amber-200 text-gym-warning-text flex items-center justify-between">
            <span className="text-xs font-bold">Warning (#F59E0B)</span>
            <span className="w-3 h-3 rounded-full bg-gym-warning" />
          </div>
          <div className="p-3.5 rounded-lg bg-gym-error-bg border border-red-200 text-gym-error-text flex items-center justify-between">
            <span className="text-xs font-bold">Error (#DC2626)</span>
            <span className="w-3 h-3 rounded-full bg-gym-error" />
          </div>
          <div className="p-3.5 rounded-lg bg-gym-info-bg border border-blue-200 text-gym-info-text flex items-center justify-between">
            <span className="text-xs font-bold">Info (#2563EB)</span>
            <span className="w-3 h-3 rounded-full bg-gym-info" />
          </div>
        </div>
      </section>

      {/* 2. Typography Scale */}
      <section id="typography" className="space-y-4 pt-6">
        <div className="border-b border-gym-border pb-2">
          <h2 className="text-headline-md text-gym-text">2. منظومة الخطوط (Typography Scale)</h2>
          <p className="text-body-sm text-gym-text-muted">Cairo للعناوين والأرقام الإحصائية | IBM Plex Sans Arabic للنصوص وواجهات المستخدم</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6 divide-y divide-gym-border-subtle">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <span className="text-xs font-mono text-gym-text-muted w-36 shrink-0">Display Large (40px / 800)</span>
              <span className="text-display-lg text-gym-text">نظام إدارة الجيم الاحترافي</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pt-4">
              <span className="text-xs font-mono text-gym-text-muted w-36 shrink-0">Headline XL (32px / 700)</span>
              <span className="text-headline-xl text-gym-text">لوحة التحكم والمؤشرات المالية</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pt-4">
              <span className="text-xs font-mono text-gym-text-muted w-36 shrink-0">Headline LG (26px / 700)</span>
              <span className="text-headline-lg text-gym-text">قائمة الاشتراكات وتجديد العضويات</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pt-4">
              <span className="text-xs font-mono text-gym-text-muted w-36 shrink-0">Headline MD (22px / 600)</span>
              <span className="text-headline-md text-gym-text">تسجيل حضور وانصراف المشتركين</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pt-4">
              <span className="text-xs font-mono text-gym-text-muted w-36 shrink-0">Body Large (16px / 400)</span>
              <span className="text-body-lg text-gym-text-secondary">
                يتيح نظام GymVIP متابعة دقيقة لكافة العمليات اليومية في الصالة الرياضية وسداد الرسوم النقدية والمحافظ الإلكترونية.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pt-4">
              <span className="text-xs font-mono text-gym-text-muted w-36 shrink-0">Body Medium (15px / 400)</span>
              <span className="text-body-md text-gym-text">
                نص افتراضي يوضح انسيابية القراءة باللغة العربية مع مراعاة المسافات وارتفاع الأسطر الصحيح.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pt-4">
              <span className="text-xs font-mono text-gym-text-muted w-36 shrink-0">Tabular Stat (28px / 700)</span>
              <span className="text-tabular-stat text-gym-primary-dark">1,248 عضو نشط | 54,200 ج.م</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 3. Button System */}
      <section id="buttons" className="space-y-4 pt-6">
        <div className="border-b border-gym-border pb-2">
          <h2 className="text-headline-md text-gym-text">3. منظومة الأزرار (Button System)</h2>
          <p className="text-body-sm text-gym-text-muted">كافة الأشكال (Variants)، الأحجام (Sizes)، والحالات التفاعلية (States)</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>الأشكال الأساسية (Variants)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary (أسود أساسي)</Button>
              <Button variant="gold">Gold Primary (ذهبي مميز)</Button>
              <Button variant="secondary">Secondary (رمادي فاتح)</Button>
              <Button variant="outline">Outline (محدد)</Button>
              <Button variant="ghost">Ghost (شفاف)</Button>
              <Button variant="success">Success (نجاح)</Button>
              <Button variant="danger">Danger (حذف / خطر)</Button>
            </div>

            <div className="pt-4 border-t border-gym-border-subtle">
              <span className="text-xs font-bold text-gym-text-muted block mb-3">الأحجام (Sizes):</span>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="sm">صغير (Small - 32px)</Button>
                <Button variant="primary" size="md">متوسط (Medium - 40px)</Button>
                <Button variant="primary" size="lg">كبير (Large - 48px)</Button>
              </div>
            </div>

            <div className="pt-4 border-t border-gym-border-subtle">
              <span className="text-xs font-bold text-gym-text-muted block mb-3">مع أيقونات وحالات تحميل (Icons & States):</span>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" startIcon={<Plus className="w-4 h-4 text-gym-primary" />}>
                  إضافة مشترك
                </Button>
                <Button variant="gold" endIcon={<Award className="w-4 h-4" />}>
                  تجديد اشتراك
                </Button>
                <Button variant="outline" isLoading>
                  جاري الحفظ
                </Button>
                <Button variant="primary" disabled>
                  زر معطل (Disabled)
                </Button>
                <Tooltip content="تصدير كملف Excel">
                  <Button variant="secondary" size="md" isIconOnly>
                    <Download className="w-4 h-4" />
                  </Button>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 4. Input System */}
      <section id="inputs" className="space-y-4 pt-6">
        <div className="border-b border-gym-border pb-2">
          <h2 className="text-headline-md text-gym-text">4. حقول الإدخال (Input System)</h2>
          <p className="text-body-sm text-gym-text-muted">مراعاة محاذاة RTL والأيقونات ورسائل التحقق والخطأ</p>
        </div>

        <Card>
          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Input
              label="اسم المشترك"
              placeholder="مثال: حسام حسن"
              isRequired
              helperText="الاسم ثلاثي كما بالبطاقة"
            />

            <PasswordInput
              label="كلمة المرور"
              isRequired
              helperText="انقر على أيقونة العين لإظهار / إخفاء"
            />

            <NumberInput
              label="المبلغ المحصل"
              value={numberVal}
              onChange={setNumberVal}
              unit="ج.م"
              step={50}
              isRequired
            />

            <DateInput
              label="تاريخ بداية الاشتراك"
              defaultValue="2026-10-07"
              isRequired
            />

            <SearchInput
              label="البحث السريع"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onClear={() => setSearchValue('')}
              shortcutKey="Ctrl+K"
            />

            <Select
              label="طريقة الدفع (مصر)"
              options={[
                { value: 'CASH', label: 'نقدي (كاش)' },
                { value: 'E_WALLET', label: 'محفظة إلكترونية (فودافون كاش / إنستاباي)' },
              ]}
              isRequired
            />

            <Input
              label="حالة نجاح التحقق (Success)"
              defaultValue="01012345678"
              state="success"
              successMessage="رقم الهاتف صالح ومتاح للاستخدام"
            />

            <Input
              label="حالة خطأ في الإدخال (Error)"
              defaultValue="invalid-email"
              error="صيغة البريد الإلكتروني غير صحيحة"
            />

            <Input
              label="حقل معطل (Disabled)"
              defaultValue="حساب مجمد"
              disabled
            />

            <div className="sm:col-span-2 lg:col-span-3">
              <Textarea
                label="ملاحظات صحية وتدريبية"
                placeholder="أدخل أي تنبيهات تخص الحالة الصحية أو قياسات المتدرب..."
                isOptional
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 5. Forms & Controls */}
      <section id="forms" className="space-y-4 pt-6">
        <div className="border-b border-gym-border pb-2">
          <h2 className="text-headline-md text-gym-text">5. عناصر النماذج والمتحكمات (Form Controls)</h2>
          <p className="text-body-sm text-gym-text-muted">مفاتيح التبديل، الاختيارات المتعددة، رفع الملفات، ورمز OTP</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>مربعات الاختيار والتبديل (Checkboxes, Radio & Switches)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Checkbox
                label="إرسال إشعار عبر واتساب عند تسجيل الدخول"
                description="إشعار تلقائي بتوقيت الحضور ورصيد الأيام المتبقية"
                checked={checkboxState}
                onChange={(e) => setCheckboxState(e.target.checked)}
              />

              <div className="pt-2">
                <Switch
                  label="تفعيل التجديد التلقائي للاشتراك"
                  description="تنبيه الاستقبال قبل 3 أيام من انتهاء الباقة"
                  checked={switchState}
                  onChange={setSwitchState}
                />
              </div>

              <div className="pt-2">
                <span className="text-xs font-semibold text-gym-text block mb-2">نوع الباقة المختارة (Radio Group):</span>
                <RadioGroup
                  name="plan_type"
                  value={radioState}
                  onChange={setRadioState}
                  options={[
                    { value: 'MONTHLY', label: 'اشتراك شهري (500 ج.م)', description: 'دخول الصالة + مدرب إرشادي' },
                    { value: 'QUARTERLY', label: 'اشتراك 3 شهور (1,350 ج.م)', description: 'يشمل تجميد 15 يوماً' },
                    { value: 'ANNUAL', label: 'اشتراك سنوي VIP (4,500 ج.م)', description: 'يشمل ساونا وجاكوزي ومدرب خاص' },
                  ]}
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <span className="text-xs font-semibold text-gym-text">أزرار Toggle:</span>
                <Toggle
                  pressed={toggleState}
                  onPressedChange={setToggleState}
                  variant="gold"
                  startIcon={<Flame className="w-4 h-4" />}
                >
                  {toggleState ? 'مشترك نشط' : 'مشترك غير نشط'}
                </Toggle>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>رفع الملفات ورمز التحقق (Upload & OTP)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FileUpload
                label="صورة المشترك الشخصية / عقد الاشتراك"
                helperText="PNG أو JPG حتى 5 ميجابايت"
              />

              <div className="pt-2">
                <span className="text-xs font-semibold text-gym-text block mb-2 text-center">
                  رمز التحقق السريع (OTP / PIN Code):
                </span>
                <OTPInput
                  length={4}
                  value={otpValue}
                  onChange={setOtpValue}
                />
                <p className="text-[11px] text-center text-gym-text-muted mt-2 font-mono" dir="ltr">
                  القيمة الحالية: {otpValue}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 6. Cards & Metric Indicators */}
      <section id="cards" className="space-y-4 pt-6">
        <div className="border-b border-gym-border pb-2">
          <h2 className="text-headline-md text-gym-text">6. البطاقات ومؤشرات الأداء (Cards & Stat Cards)</h2>
          <p className="text-body-sm text-gym-text-muted">عرض الإحصائيات مع Cairo Tabular Numbers واتجاهات النمو</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="إجمالي المشتركين النشطين"
            value="1,248"
            unit="عضو"
            trend="up"
            trendPercentage="+12.5%"
            trendLabel="عن الشهر الماضي"
            icon={<Users className="w-5 h-5" />}
            accentColor="black"
          />

          <StatCard
            title="الإيرادات الشهرية المحصلة"
            value="142,500"
            unit="ج.م"
            trend="up"
            trendPercentage="+8.2%"
            trendLabel="مقارنة بالمستهدف"
            icon={<CreditCard className="w-5 h-5" />}
            accentColor="gold"
          />

          <StatCard
            title="حضور اليوم في الصالة"
            value="184"
            unit="متدرب"
            trend="neutral"
            trendPercentage="0.0%"
            trendLabel="معدل الذروة: 6 مساءً"
            icon={<CalendarCheck className="w-5 h-5" />}
            accentColor="success"
          />

          <StatCard
            title="اشتراكات تنتهي هذا الأسبوع"
            value="29"
            unit="اشتراك"
            trend="down"
            trendPercentage="-4"
            trendLabel="تحتاج متابعة تجديد"
            icon={<Award className="w-5 h-5" />}
            accentColor="warning"
          />
        </div>

        {/* Card Variants Demonstration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <Card variant="default">
            <CardHeader>
              <CardTitle>بطاقة افتراضية (Default)</CardTitle>
              <CardDescription>حدود ناعمة مع ظل خفيف</CardDescription>
            </CardHeader>
            <CardContent>
              محتوى البطاقة الافتراضية المناسبة للبيانات والتفاصيل اليومية.
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>بطاقة بارزة (Elevated)</CardTitle>
              <CardDescription>ظل متوسط للتركيز</CardDescription>
            </CardHeader>
            <CardContent>
              تستخدم لإبراز العناصر الهامة مثل الخطط المميزة والملخصات.
            </CardContent>
          </Card>

          <Card variant="interactive">
            <CardHeader>
              <CardTitle>بطاقة تفاعلية (Interactive)</CardTitle>
              <CardDescription>تأثير عند التمرير Hover</CardDescription>
            </CardHeader>
            <CardContent>
              تستخدم للروابط السريعة والاختيارات القابلة للنقر.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 7. Badges & Statuses */}
      <section id="badges" className="space-y-4 pt-6">
        <div className="border-b border-gym-border pb-2">
          <h2 className="text-headline-md text-gym-text">7. الشارات وحالات العضوية (Badges & Statuses)</h2>
          <p className="text-body-sm text-gym-text-muted">حالات الاشتراكات والمدفوعات المعتمدة في GymVIP</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <span className="text-xs font-bold text-gym-text-muted block mb-3">حالات العضويات المسبقة (Gym Statuses):</span>
              <div className="flex flex-wrap items-center gap-3">
                <Badge status="active" dot />
                <Badge status="expired" dot />
                <Badge status="frozen" dot />
                <Badge status="pending" dot />
                <Badge status="paid" dot />
                <Badge status="unpaid" dot />
                <Badge status="partial" dot />
              </div>
            </div>

            <div className="pt-4 border-t border-gym-border-subtle">
              <span className="text-xs font-bold text-gym-text-muted block mb-3">الأنماط اللونية (Badge Variants):</span>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="gold">عضوية VIP ذهبية</Badge>
                <Badge variant="black">مالك الصالة</Badge>
                <Badge variant="success">عملية مؤكدة</Badge>
                <Badge variant="warning">قيد المراجعة</Badge>
                <Badge variant="error">دفعة ملغاة</Badge>
                <Badge variant="info">تحويل بنكي</Badge>
                <Badge variant="neutral">مسودة</Badge>
                <Badge variant="outline">بدون خلفية</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 8. Data Table System */}
      <section id="tables" className="space-y-4 pt-6">
        <div className="border-b border-gym-border pb-2">
          <h2 className="text-headline-md text-gym-text">8. نظام الجداول (Data Table System)</h2>
          <p className="text-body-sm text-gym-text-muted">جدول بيانات متجاوب مع تحديد متعدد، شارات، وأعمدة الإجراءات</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === sampleMembers.length}
                      onChange={(e) =>
                        setSelectedRows(e.target.checked ? sampleMembers.map((m) => m.id) : [])
                      }
                      className="rounded border-gym-border text-gym-black focus:ring-gym-primary"
                    />
                  </TableHead>
                  <TableHead>المشترك</TableHead>
                  <TableHead>رقم الهاتف</TableHead>
                  <TableHead>الباقة / العضوية</TableHead>
                  <TableHead>حالة الاشتراك</TableHead>
                  <TableHead>حالة السداد</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleMembers.map((member) => {
                  const isSelected = selectedRows.includes(member.id)
                  return (
                    <TableRow key={member.id} isSelected={isSelected}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(member.id)}
                          className="rounded border-gym-border text-gym-black focus:ring-gym-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={member.name} size="sm" status={member.status === 'active' ? 'online' : 'offline'} />
                          <span className="font-bold text-xs text-gym-text">{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gym-text-secondary">{member.phone}</TableCell>
                      <TableCell className="text-xs">{member.plan}</TableCell>
                      <TableCell>
                        <Badge status={member.status} dot size="sm" />
                      </TableCell>
                      <TableCell>
                        <Badge status={member.payment} size="sm" />
                      </TableCell>
                      <TableCell className="font-bold text-xs font-cairo">{member.amount}</TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip content="تعديل العضو">
                            <Button variant="ghost" size="sm" isIconOnly>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          </Tooltip>
                          <Dropdown
                            align="left"
                            trigger={
                              <Button variant="ghost" size="sm" isIconOnly>
                                <MoreVertical className="w-3.5 h-3.5" />
                              </Button>
                            }
                            items={[
                              { label: 'عرض التفاصيل', onClick: () => toast.info('تفاصيل المشترك') },
                              { label: 'تجميد الاشتراك', onClick: () => toast.warning('تم التجميد') },
                              { divider: true, label: '' },
                              { label: 'حذف العضو', danger: true, onClick: () => setIsDangerOpen(true) },
                            ]}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="p-3 border-t border-gym-border">
            <Pagination
              currentPage={currentPage}
              totalPages={5}
              totalItems={48}
              pageSize={10}
              onPageChange={setCurrentPage}
            />
          </CardFooter>
        </Card>
      </section>

      {/* 9. Modals & Drawers */}
      <section id="overlays" className="space-y-4 pt-6">
        <div className="border-b border-gym-border pb-2">
          <h2 className="text-headline-md text-gym-text">9. النوافذ المنبثقة والدرج الجانبي (Modals & Drawer)</h2>
          <p className="text-body-sm text-gym-text-muted">دعم كامل لفتح الدرج من جهة اليمين (RTL Right Slide-over) ونوافذ التأكيد</p>
        </div>

        <Card>
          <CardContent className="p-6 flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              نافذة منبثقة عادية (Standard Modal)
            </Button>

            <Button variant="secondary" onClick={() => setIsConfirmOpen(true)}>
              نافذة تأكيد عملية (Confirmation)
            </Button>

            <Button variant="danger" onClick={() => setIsDangerOpen(true)}>
              نافذة حذف وتحذير (Danger Modal)
            </Button>

            <Button
              variant="gold"
              onClick={() => setIsDrawerOpen(true)}
              startIcon={<Layers className="w-4 h-4 text-gym-black" />}
            >
              فتح الدرج الجانبي من اليمين (Right Drawer)
            </Button>
          </CardContent>
        </Card>

        {/* Modal Components */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="تفاصيل باقة الاشتراك المميزة"
          description="معلومات الباقة وخيارات التجديد المتاحة"
        >
          <div className="space-y-4 font-body text-xs leading-relaxed">
            <p className="text-gym-text">
              تتيح باقة VIP السنوية الدخول غير المحدود لصالة اللياقة البدنية والحديد مع حصص تدريب وظيفي وتأهيل رياضي مجانية.
            </p>
            <div className="p-3 bg-zinc-50 rounded-md border border-gym-border flex items-center justify-between">
              <span className="font-semibold">سعر الاشتراك السنوي:</span>
              <span className="font-bold text-gym-primary-dark font-cairo text-sm">4,500 ج.م</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="primary" onClick={() => setIsModalOpen(false)}>
                حفظ وإغلاق
              </Button>
            </div>
          </div>
        </Modal>

        <ConfirmationModal
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={() => {
            setIsConfirmOpen(false)
            toast.success('تمت العملية', 'تم تأكيد تجديد اشتراك العضو بنجاح')
          }}
          title="هل أنت متأكد من تجديد الاشتراك؟"
          description="سيتم تمديد فترة صلاحية العضوية لمدة 30 يوماً إضافية وتوليد إيصال دفع جديد."
        />

        <DangerConfirmationModal
          isOpen={isDangerOpen}
          onClose={() => setIsDangerOpen(false)}
          onConfirm={() => {
            setIsDangerOpen(false)
            toast.error('تم الحذف', 'تم حذف السجل نهائياً من قاعدة البيانات')
          }}
          title="تأكيد حذف المشترك نهائياً"
          description="تحذير: هذه العملية لا يمكن التراجع عنها وسيتم حذف كافة سجلات الحضور والمدفوعات الخاصة بهذا المشترك."
        />

        {/* Drawer Component */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title="تصفية المشتركين المتقدمة"
          description="حدد المعايير لتصفية قائمة الأعضاء"
          position="right"
        >
          <div className="space-y-4 font-body">
            <Input label="اسم المشترك" placeholder="بحث بالاسم..." />
            <Select
              label="حالة العضوية"
              options={[
                { value: 'ALL', label: 'كافة الحالات' },
                { value: 'ACTIVE', label: 'النشطون فقط' },
                { value: 'EXPIRED', label: 'المنتهية عضوياتهم' },
                { value: 'FROZEN', label: 'المجمدة حالياً' },
              ]}
            />
            <Select
              label="طريقة السداد"
              options={[
                { value: 'ALL', label: 'الكل' },
                { value: 'CASH', label: 'نقدي فقط' },
                { value: 'E_WALLET', label: 'فودافون كاش / إنستاباي' },
              ]}
            />
            <div className="pt-4 flex flex-col gap-2">
              <Button variant="primary" onClick={() => setIsDrawerOpen(false)}>
                تطبيق التصفية
              </Button>
              <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>
                إعادة ضبط
              </Button>
            </div>
          </div>
        </Drawer>
      </section>

      {/* 10. Navigation, Dropdowns & Context Menu */}
      <section id="navigation" className="space-y-4 pt-6">
        <div className="border-b border-gym-border pb-2">
          <h2 className="text-headline-md text-gym-text">10. القوائم والمنسدلات (Dropdowns & Menus)</h2>
          <p className="text-body-sm text-gym-text-muted">قوائم سياقية وقوائم منسدلة وتبويبات مخصصة</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>القوائم المنسدلة (Dropdown Menu)</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Dropdown
                trigger={<Button variant="primary">خيارات الحساب ▾</Button>}
                items={[
                  { label: 'الملف الشخصي', onClick: () => toast.info('الملف الشخصي') },
                  { label: 'إعدادات الصالة', onClick: () => toast.info('الإعدادات') },
                  { divider: true, label: '' },
                  { label: 'تسجيل الخروج', danger: true, onClick: () => toast.error('تم تسجيل الخروج') },
                ]}
              />

              <ContextMenu
                items={[
                  { label: 'تعديل سريع', onClick: () => toast.info('تعديل') },
                  { label: 'طباعة الإيصال', onClick: () => toast.success('طباعة') },
                  { divider: true, label: '' },
                  { label: 'حذف', danger: true, onClick: () => toast.error('حذف') },
                ]}
              >
                <div className="p-4 border-2 border-dashed border-gym-border rounded-lg text-center text-xs font-semibold text-gym-text-muted cursor-context-menu hover:bg-zinc-50">
                  انقر بزر الفأرة الأيمن هنا (Context Menu)
                </div>
              </ContextMenu>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>أنماط التبويبات (Tabs Variants)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-xs font-bold text-gym-text-muted block mb-2">Pill Tabs:</span>
                <Tabs
                  variant="pills"
                  activeTab="t1"
                  onChange={() => {}}
                  tabs={[
                    { id: 't1', label: 'الكل', badge: '124' },
                    { id: 't2', label: 'ساري', badge: '98' },
                    { id: 't3', label: 'منتهي', badge: '26' },
                  ]}
                />
              </div>

              <div className="pt-2">
                <span className="text-xs font-bold text-gym-text-muted block mb-2">Underline Tabs (Gold Accent):</span>
                <Tabs
                  variant="underline"
                  activeTab="u1"
                  onChange={() => {}}
                  tabs={[
                    { id: 'u1', label: 'المدفوعات النقدية' },
                    { id: 'u2', label: 'المحافظ الإلكترونية' },
                    { id: 'u3', label: 'المعاملات المعلقة' },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 11. Alerts & Toast Notifications */}
      <section id="feedback" className="space-y-4 pt-6">
        <div className="border-b border-gym-border pb-2">
          <h2 className="text-headline-md text-gym-text">11. التنبيهات والإشعارات (Alerts & Toasts)</h2>
          <p className="text-body-sm text-gym-text-muted">رسائل الحالة والتنبيهات المباشرة بنظام Toast</p>
        </div>

        <div className="space-y-3">
          <Alert variant="success" title="تم حفظ البيانات بنجاح">
            تم تسجيل دفعة الاشتراك وتحديث تاريخ انتهاء عضوية المشترك تلقائياً.
          </Alert>

          <Alert variant="warning" title="تنبيه: اقتراب انتهاء الاشتراك">
            تبقى 3 أيام فقط على انتهاء اشتراك 14 عضواً في الصالة.
          </Alert>

          <Alert variant="error" title="حدث خطأ أثناء تنفيذ العملية">
            تعذر الاتصال بالخادم، يرجى مراجعة الاتصال بالإنترنت والمحاولة مجدداً.
          </Alert>

          <Alert variant="info" title="تحديثات النظام">
            نظام GymVIP يدعم الدفع النقدي ومحافظ فودافون كاش وإنستاباي بالسوق المصري.
          </Alert>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>إطلاق إشعارات Toast التفاعلية</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button variant="success" size="sm" onClick={() => toast.success('تم الحفظ', 'تم حفظ بيانات المشترك بنجاح')}>
              إشعار نجاح (Success Toast)
            </Button>
            <Button variant="danger" size="sm" onClick={() => toast.error('خطأ في العملية', 'تعذر إتمام الدفعة')}>
              إشعار خطأ (Error Toast)
            </Button>
            <Button variant="secondary" size="sm" onClick={() => toast.warning('تنبيه اشتراك', 'الاشتراك ينتهي غداً')}>
              إشعار تحذير (Warning Toast)
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.info('معلومة', 'تم تحديث خطط الأسعار')}>
              إشعار معلومة (Info Toast)
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* 12. Loading & Empty States */}
      <section id="loading" className="space-y-4 pt-6">
        <div className="border-b border-gym-border pb-2">
          <h2 className="text-headline-md text-gym-text">12. حالات التحميل والحالات الفارغة (Loading & Empty States)</h2>
          <p className="text-body-sm text-gym-text-muted">مؤشرات تحميل وهياكل عظمية (Skeletons) وتصاميم فراغية راقية</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>مؤشرات التحميل (Spinners & Skeletons)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Spinner size="sm" color="gold" />
                <Spinner size="md" color="black" />
                <Spinner size="lg" color="gold" />
                <ButtonLoader size="md" />
              </div>

              <div className="pt-2">
                <span className="text-xs font-bold text-gym-text-muted block mb-2">هيكل البطاقة (Card Skeleton):</span>
                <CardSkeleton />
              </div>

              <div className="pt-2">
                <span className="text-xs font-bold text-gym-text-muted block mb-2">هيكل الجدول (Table Skeleton):</span>
                <div className="border border-gym-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      <TableSkeleton rows={2} cols={3} />
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الحالات الفارغة (Empty State Component)</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={<Users className="w-8 h-8 text-gym-text-muted" />}
                title="لا يوجد مشتركون حالياً"
                description="ابدأ بإضافة أول مشترك في صالتك الرياضية لتتمكن من إصدار الاشتراكات وتتبع الحضور."
                actionLabel="إضافة أول مشترك"
                actionIcon={<Plus className="w-4 h-4" />}
                onAction={() => toast.info('فتح نموذج الإضافة')}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 13. Avatars & Global Search */}
      <section id="tokens" className="space-y-4 pt-6 pb-12">
        <div className="border-b border-gym-border pb-2">
          <h2 className="text-headline-md text-gym-text">13. الأفاتار والبحث المتقدم (Avatars & Global Search)</h2>
          <p className="text-body-sm text-gym-text-muted">أحجام الصور الرمزية ونقاط الاتصال وشريط البحث الشامل</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>الأفاتار ومجموعات المستخدمين (Avatars)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar name="حسام حسن" size="xs" status="online" />
                <Avatar name="أحمد الشناوي" size="sm" status="online" />
                <Avatar name="كريم عبد العزيز" size="md" status="busy" />
                <Avatar name="محمد صلاح" size="lg" status="online" />
                <Avatar name="كابتن طارق" size="xl" status="away" />
              </div>

              <div className="pt-3 border-t border-gym-border-subtle">
                <span className="text-xs font-bold text-gym-text-muted block mb-2">مجموعة صور (Avatar Group):</span>
                <AvatarGroup max={4} size="md">
                  <Avatar name="محمود علي" />
                  <Avatar name="خالد يوسف" />
                  <Avatar name="عمر جابر" />
                  <Avatar name="ياسين إبراهيم" />
                  <Avatar name="هيثم فاروق" />
                  <Avatar name="مصطفى فتحي" />
                </AvatarGroup>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>البحث الشامل والأيقونات القياسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <GlobalSearch
                placeholder="ابحث عن مشترك، اشتراك، دفعة..."
                shortcut="Ctrl+K"
                onSearch={(q) => toast.info(`تم البحث عن: ${q}`)}
              />

              <div className="pt-2 border-t border-gym-border-subtle flex items-center justify-between">
                <span className="text-xs font-bold text-gym-text-muted">أحجام الأيقونات القياسية (Lucide):</span>
                <div className="flex items-center gap-3 text-gym-text">
                  <Icon icon={Crown} size={16} />
                  <Icon icon={Crown} size={18} />
                  <Icon icon={Crown} size={20} />
                  <Icon icon={Crown} size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

export default DesignSystemPage
