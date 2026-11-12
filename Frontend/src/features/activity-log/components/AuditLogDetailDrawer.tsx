import React from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import {
  AUDIT_ACTION_MAP,
  AUDIT_ENTITY_MAP,
  ROLE_LABELS,
  ROLE_BADGE_VARIANTS,
  formatCairoDateTime,
} from '../utils/auditLabels'
import type { AuditLog } from '../types'
import { Shield, Clock, User, ArrowLeftRight, FileText, Info } from 'lucide-react'

interface AuditLogDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  log: AuditLog | null
}

const FIELD_ARABIC_NAMES: Record<string, string> = {
  name: 'الاسم',
  email: 'البريد الإلكتروني',
  phone: 'رقم الهاتف',
  role: 'الرتبة / الدور',
  isActive: 'حالة الحساب / التفعيل',
  status: 'حالة الاشتراك',
  planName: 'اسم الباقة',
  planPrice: 'سعر الباقة',
  price: 'السعر',
  durationDays: 'مدة الباقة (أيام)',
  startDate: 'تاريخ البدء',
  endDate: 'تاريخ الانتهاء',
  amount: 'المبلغ',
  currency: 'العملة',
  method: 'طريقة الدفع',
  memberCode: 'كود العضو',
  gender: 'النوع',
  address: 'العنوان',
  specialization: 'التخصص',
  bio: 'نبذة عن المدرب',
  reason: 'سبب التجميد',
  days: 'عدد الأيام',
  notes: 'ملاحظات',
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'boolean') return val ? 'نشط / صحيح' : 'معطل / غير صحيح'
  if (typeof val === 'object') {
    if (val.name) return String(val.name)
    return JSON.stringify(val)
  }
  return String(val)
}

export const AuditLogDetailDrawer: React.FC<AuditLogDetailDrawerProps> = ({
  isOpen,
  onClose,
  log,
}) => {
  if (!log) return null

  const actionInfo = AUDIT_ACTION_MAP[log.action] || {
    label: log.action,
    variant: 'neutral' as const,
  }
  const entityLabel = AUDIT_ENTITY_MAP[log.entityType] || log.entityType

  // Calculate field differences if beforeData and afterData exist
  const changedKeys = Array.from(
    new Set([
      ...Object.keys(log.beforeData || {}),
      ...Object.keys(log.afterData || {}),
    ])
  ).filter((key) => {
    // Hide internal fields from comparison
    return !['passwordHash', 'createdAt', 'updatedAt', 'gymId'].includes(key)
  })

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="تفاصيل العملية المسجلة"
      description="مراجعة التغييرات والبيانات الحساسة المرتبطة بالعملية"
      size="lg"
    >
      <div className="space-y-6 text-sm">
        {/* Main Action Header Card */}
        <Card className="border border-zinc-800 bg-zinc-900/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant={actionInfo.variant} size="md">
                {actionInfo.label}
              </Badge>
              <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                {formatCairoDateTime(log.createdAt)}
              </span>
            </div>

            <p className="text-sm font-medium text-zinc-100 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/80 leading-relaxed">
              {log.description}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <User className="w-4 h-4 text-primary-400 shrink-0" />
                <span>المنفذ:</span>
                <span className="font-semibold text-zinc-100">
                  {log.actorUser ? log.actorUser.name : 'النظام تلقائياً'}
                </span>
                {log.actorUser && (
                  <Badge
                    variant={ROLE_BADGE_VARIANTS[log.actorUser.role] || 'neutral'}
                    size="sm"
                  >
                    {ROLE_LABELS[log.actorUser.role] || log.actorUser.role}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-zinc-300">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>النوع:</span>
                <span className="font-medium text-zinc-200">{entityLabel}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Changes Diff Table */}
        {(log.beforeData || log.afterData) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-200 font-medium">
              <ArrowLeftRight className="w-4 h-4 text-primary-400" />
              <span>مقارنة البيانات والتغييرات (Audit Diff)</span>
            </div>

            <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/30">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/70 text-zinc-400">
                    <th className="p-2.5 font-medium">الحقل</th>
                    {log.beforeData && (
                      <th className="p-2.5 font-medium text-rose-400">قبل التعديل</th>
                    )}
                    <th className="p-2.5 font-medium text-emerald-400">
                      {log.beforeData ? 'بعد التعديل' : 'القيمة المسجلة'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {changedKeys.map((key) => {
                    const beforeVal = log.beforeData ? log.beforeData[key] : undefined
                    const afterVal = log.afterData ? log.afterData[key] : undefined
                    const isDifferent =
                      log.beforeData &&
                      JSON.stringify(beforeVal) !== JSON.stringify(afterVal)

                    return (
                      <tr
                        key={key}
                        className={
                          isDifferent ? 'bg-amber-950/15' : 'hover:bg-zinc-900/30'
                        }
                      >
                        <td className="p-2.5 font-sans font-medium text-zinc-300">
                          {FIELD_ARABIC_NAMES[key] || key}
                        </td>
                        {log.beforeData && (
                          <td className="p-2.5 text-rose-300/90 break-all">
                            {formatValue(beforeVal)}
                          </td>
                        )}
                        <td className="p-2.5 text-emerald-300/90 break-all">
                          {formatValue(afterVal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Metadata Details (if present) */}
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-200 font-medium">
              <Info className="w-4 h-4 text-sky-400" />
              <span>بيانات إضافية (Metadata)</span>
            </div>

            <div className="p-3 bg-zinc-950/40 rounded-lg border border-zinc-800 space-y-1.5 text-xs">
              {Object.entries(log.metadata).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center py-1 border-b border-zinc-800/40 last:border-0">
                  <span className="text-zinc-400 font-medium">
                    {FIELD_ARABIC_NAMES[k] || k}:
                  </span>
                  <span className="text-zinc-200 font-mono">{formatValue(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Audit Identifier Footer */}
        <div className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-800/50 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            معرف السجل الثابت:
          </span>
          <span className="font-mono text-zinc-400 select-all">{log.id}</span>
        </div>
      </div>
    </Drawer>
  )
}
