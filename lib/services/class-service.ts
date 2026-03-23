import {
  getClassesCollection,
  getClassDatesCollection,
  getAttendancesCollection,
  getTransferTicketsCollection,
  getAnnouncementsCollection,
  getMembersCollection,
} from '../db'
import type { Class, ClassDate, Attendance, TransferTicket, Announcement } from '../models'

// 今後のクラス予定を取得（会員の参加クラス対象、休講日除外）
export async function getUpcomingClasses(memberId: string, daysAhead: number = 14) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + daysAhead)
  endDate.setHours(23, 59, 59, 999)

  const membersCollection = await getMembersCollection()
  const member = await membersCollection.findOne({ id: memberId })
  const enrolledClassIds = Array.isArray(member?.enrolled_class_ids)
    ? member.enrolled_class_ids
    : []

  const classesCollection = await getClassesCollection()
  const classDatesCollection = await getClassDatesCollection()
  const attendancesCollection = await getAttendancesCollection()

  const query: any = {
    date: { $gte: today, $lte: endDate },
    is_cancelled: false,
    $or: [
      { session_status: { $exists: false } },
      { session_status: 'scheduled' },
      { session_status: 'completed' },
    ],
  }

  if (enrolledClassIds.length > 0) {
    query.class_id = { $in: enrolledClassIds }
  }

  const classDates = await classDatesCollection.find(query).sort({ date: 1, class_id: 1 }).toArray()

  const result = []
  for (const classDate of classDates) {
    const classInfo = await classesCollection.findOne({ id: classDate.class_id })
    if (!classInfo || !classInfo.is_active) continue

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
    const dateA = new Date(a.classDate.date).getTime()
    const dateB = new Date(b.classDate.date).getTime()
    if (dateA !== dateB) return dateA - dateB
    return (a.class.start_time || '').localeCompare(b.class.start_time || '')
  })
}

// 本日のクラス予定を取得（getUpcomingClasses の今日分として利用可）
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
