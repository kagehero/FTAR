import { TRANSFER_DEADLINE_MONTHS } from './constants'

/**
 * 振替チケットの有効期限:
 * 欠席した開催日（class_dates.date）を基準に、そこから TRANSFER_DEADLINE_MONTHS ヶ月後の同日 23:59:59 まで。
 * 例: 4/27 欠席 → 6/27 23:59:59（発行日ではなく欠席日基準）
 */
export function computeTransferTicketExpiryFromAbsenceDate(absenceDate: Date): Date {
  const d = new Date(absenceDate.getTime())
  d.setMonth(d.getMonth() + TRANSFER_DEADLINE_MONTHS)
  d.setHours(23, 59, 59, 999)
  return d
}
