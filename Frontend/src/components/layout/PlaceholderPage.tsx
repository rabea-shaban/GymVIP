import React from 'react'
import { PageHeader, BreadcrumbItem } from './PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardContent } from '@/components/ui/Card'

export interface PlaceholderPageProps {
  title: string
  description: string
  breadcrumbs?: BreadcrumbItem[]
  icon?: React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
  actionLabel?: string
  onAction?: () => void
  actions?: React.ReactNode
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description,
  breadcrumbs,
  icon,
  emptyTitle,
  emptyDescription,
  actionLabel,
  onAction,
  actions,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        actions={actions}
      />

      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={icon}
            title={emptyTitle || `قسم ${title}`}
            description={
              emptyDescription ||
              `هذه الصفحة جاهزة لربط واجهات برمجة التطبيقات (APIs) والعمليات الخاصة بـ ${title}.`
            }
            actionLabel={actionLabel}
            onAction={onAction}
          />
        </CardContent>
      </Card>
    </div>
  )
}
