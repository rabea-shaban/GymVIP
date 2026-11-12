export type ExportFormat = 'csv' | 'xlsx'

export interface ExportFilterQuery {
  format?: ExportFormat
  from?: string // YYYY-MM-DD
  to?: string // YYYY-MM-DD
  status?: string
  method?: string
  paymentMethod?: string
  search?: string
  memberId?: string
}

export interface ExportColumn {
  header: string
  key: string
  width?: number
}

export interface ExportResult {
  buffer: Buffer
  filename: string
  contentType: string
  rowCount: number
  format: ExportFormat
}
