import {
  getClassesCollection,
  getClassDatesCollection,
  getAttendancesCollection,
  getTransferTicketsCollection,
  getAnnouncementsCollection,
} from '../db'
import type { Class, ClassDate, Attendance, TransferTicket, Announcement } from '../models'

// 本日のクラス予定を取得
export async function getTodayClasses(memberId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const classesCollection = await getClassesCollection()
  const classDatesCollection = await getClassDatesCollection()
  const attendancesCollection = await getAttendancesCollection()

  // 本日の開催日を取得
  const todayClassDates = await classDatesCollection
    .find({
      date: { $gte: today, $lt: tomorrow },
      is_cancelled: false,
    })
    .toArray()

  const result = []

  for (const classDate of todayClassDates) {
    const classInfo = await classesCollection.findOne({ id: classDate.class_id })
    if (!classInfo) continue

    const attendance = await attendancesCollection.findOne({
      member_id: memberId,
      class_date_id: classDate.id,
    })

    result.push({
      classDate,
      class: classInfo,
      attendance: attendance || null,
    })
  }

  return result.sort((a, b) => {
    const timeA = a.class.start_time
    const timeB = b.class.start_time
    return timeA.localeCompare(timeB)
  })
}

// 振替チケット残数を取得
export async function getTransferTicketCount(memberId: string): Promise<number> {
  const ticketsCollection = await getTransferTicketsCollection()
  const now = new Date()

  const count = await ticketsCollection.countDocuments({
    member_id: memberId,
    status: 'unused',
    expires_at: { $gt: now },
  })

  return count
}

// お知らせを取得
export async function getAnnouncements(memberId: string, memberGrade?: string) {
  const announcementsCollection = await getAnnouncementsCollection()
  const now = new Date()

  // 会員向けのお知らせを取得
  const announcements = await announcementsCollection
    .find({
      is_active: true,
      $or: [
        { target_audience: 'all' },
        { target_audience: 'members' },
      ],
      created_at: { $lte: now },
    })
    .sort({ created_at: -1 })
    .limit(10)
    .toArray()

  return announcements
}
