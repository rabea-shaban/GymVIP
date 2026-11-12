import { api } from './api'

export interface ExportParams {
  format?: 'csv' | 'xlsx'
  from?: string
  to?: string
  status?: string
  method?: string
  paymentMethod?: string
  search?: string
  memberId?: string
}

export type ExportEndpoint =
  | 'members'
  | 'subscriptions'
  | 'payments'
  | 'attendance'
  | 'plans'
  | 'activity-logs'

/**
 * Downloads business data export as a file (CSV or XLSX)
 */
export async function downloadExport(
  endpoint: ExportEndpoint,
  params?: ExportParams
): Promise<void> {
  const response = await api.get(`/exports/${endpoint}`, {
    params,
    responseType: 'blob',
  })

  // Parse filename from Content-Disposition header if available
  const contentDisposition = response.headers['content-disposition']
  let filename = `gymvip-${endpoint}-${new Date().toISOString().split('T')[0]}.${params?.format || 'csv'}`
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/)
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1]
    }
  }

  // Determine MIME type
  const isXlsx = params?.format === 'xlsx' || filename.endsWith('.xlsx')
  const mimeType = isXlsx
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv; charset=utf-8'

  const blob = new Blob([response.data], { type: mimeType })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Revoke object URL after slight delay to ensure browser handled download
  setTimeout(() => {
    window.URL.revokeObjectURL(url)
  }, 1000)
}
