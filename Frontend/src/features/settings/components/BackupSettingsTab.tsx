import React from 'react'
import {
  Database,
  HardDrive,
  Download,
  RotateCcw,
  Plus,
  CheckCircle2,
  Clock,
  FileCheck,
} from 'lucide-react'
import { useBackups } from '../../backups/hooks/useBackups'

export const BackupSettingsTab: React.FC = () => {
  const {
    backups,
    isLoading,
    createBackup,
    isCreating,
    downloadBackup,
    restoreBackup,
    isRestoring,
  } = useBackups()

  return (
    <div className="space-y-6" dir="rtl">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Engine Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Database className="w-4 h-4 text-primary-500" />
              محرك قاعدة البيانات
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              SQLite (مستقل بالكامل)
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            ملف قاعدة البيانات المحلي:{' '}
            <span className="font-mono text-primary-600 dark:text-primary-400">gymvip.db</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            تعمل قاعدة البيانات بدون الحاجة لتثبيت أي سيرفرات أو خدمات إضافية، وتوفر سرعة فائقة
            واستقراراً تاماً داخل النادي.
          </p>
        </div>

        {/* Auto Backup Status Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              النسخ الاحتياطي التلقائي
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              مفعل يومياً
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            الجدولة: <span className="text-indigo-600 dark:text-indigo-400">كل 24 ساعة تلقائياً</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            يقوم النظام تلقائياً بإنشاء نسخة احتياطية يومية في مجلد <code className="text-xs font-mono">backups/</code> مع
            الاحتفاظ بآخر 30 نسخة لحماية مساحة القرص.
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            النسخ الاحتياطية المحفوظة ({backups.length})
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            يمكنك تحميل أي نسخة احتياطية لحفظها على فلاشة USB أو سحابة، أو استعادة البيانات في أي وقت.
          </p>
        </div>

        <button
          type="button"
          onClick={() => createBackup()}
          disabled={isCreating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs transition-all shadow-md shadow-primary-500/20 disabled:opacity-50 cursor-pointer"
        >
          {isCreating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              جاري إنشاء النسخة...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              إنشاء نسخة احتياطية الآن
            </>
          )}
        </button>
      </div>

      {/* Backups List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-slate-500 text-sm">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin ml-2" />
            جاري استرجاع سجل النسخ الاحتياطية...
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <HardDrive className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              لا توجد نسخ احتياطية محفوظة حتى الآن
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              اضغط على "إنشاء نسخة احتياطية الآن" لإنشاء أول نقطة استعادة لقاعدة بيانات النادي.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                <tr>
                  <th className="px-5 py-3">اسم الملف</th>
                  <th className="px-5 py-3">النوع</th>
                  <th className="px-5 py-3">الحجم</th>
                  <th className="px-5 py-3">تاريخ ووقت الإنشاء</th>
                  <th className="px-5 py-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="truncate max-w-xs">{b.fileName}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          b.backupType === 'AUTO'
                            ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                            : 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
                        }`}
                      >
                        {b.backupType === 'AUTO' ? 'تلقائي' : 'يدوي'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                      {b.fileSizeFormatted}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                      {new Date(b.createdAt).toLocaleString('ar-EG', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => downloadBackup(b.fileName)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          title="تحميل النسخة الاحتياطية"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => restoreBackup(b.fileName)}
                          disabled={isRestoring}
                          className="px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800/80 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          title="استعادة قاعدة البيانات من هذه النسخة"
                        >
                          <RotateCcw className="w-3 h-3" />
                          استعادة
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
