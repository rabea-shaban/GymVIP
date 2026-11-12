import ExcelJS from 'exceljs'
import type { ExportColumn } from '../types/export.types.js'

/**
 * Formula injection protection:
 * Characters like '=', '+', '-', '@', '\t', '\r' can trigger formula execution in Excel/Spreadsheets.
 * Prepending a single quote (') forces the spreadsheet program to treat the content as literal text.
 */
export function sanitizeFormulaInjection(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`
  }
  return str
}

/**
 * Escapes a single value for CSV output:
 * - Doubles internal double quotes (" -> "")
 * - Wraps in double quotes for safe handling of commas, quotes, linebreaks, and Arabic text
 */
export function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '""'
  const str = sanitizeFormulaInjection(val)
  return `"${str.replace(/"/g, '""')}"`
}

/**
 * Generates a valid UTF-8 CSV buffer with Byte Order Mark (BOM) for Arabic Excel compatibility.
 */
export function generateCsv(columns: ExportColumn[], data: Record<string, any>[]): Buffer {
  const BOM = '\uFEFF'
  const headerRow = columns.map((col) => escapeCsvValue(col.header)).join(',')
  const dataRows = data.map((row) =>
    columns.map((col) => escapeCsvValue(row[col.key] ?? '')).join(',')
  )

  const content = BOM + [headerRow, ...dataRows].join('\r\n')
  return Buffer.from(content, 'utf-8')
}

/**
 * Generates an XLSX file buffer using ExcelJS with RTL sheet orientation and safe cells.
 */
export async function generateXlsx(
  sheetName: string,
  columns: ExportColumn[],
  data: Record<string, any>[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GymVIP SaaS'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ rightToLeft: true }], // Full RTL sheet orientation
  })

  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 20,
  }))

  // Style Header Row
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, name: 'Cairo', size: 11, color: { argb: 'FF18181B' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF4D76A' }, // GymVIP Gold Light
  }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
  headerRow.height = 26

  // Add Data Rows
  data.forEach((item) => {
    const rowValues: Record<string, any> = {}
    columns.forEach((col) => {
      const rawVal = item[col.key]
      if (rawVal === null || rawVal === undefined) {
        rowValues[col.key] = ''
      } else if (typeof rawVal === 'number') {
        rowValues[col.key] = rawVal
      } else {
        // String values: sanitize formula injection
        rowValues[col.key] = sanitizeFormulaInjection(rawVal)
      }
    })

    const row = worksheet.addRow(rowValues)
    row.font = { name: 'Cairo', size: 10 }
    row.alignment = { horizontal: 'right', vertical: 'middle' }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * Formats a Date to YYYY-MM-DD in Africa/Cairo timezone
 */
export function formatCairoDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
  } catch {
    return '-'
  }
}

/**
 * Formats a Date to YYYY-MM-DD HH:mm in Africa/Cairo timezone
 */
export function formatCairoDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '-'
    const datePart = d.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
    const timePart = d.toLocaleTimeString('en-GB', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit',
    })
    return `${datePart} ${timePart}`
  } catch {
    return '-'
  }
}
