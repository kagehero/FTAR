import {
  getWaitlistsCollection,
  getAttendancesCollection,
  getClassesCollection,
  getClassDatesCollection,
  getTransferTicketsCollection,
  getMembersCollection,
} from '../db'
import type { Waitlist, Attendance, TransferTicket } from '../models'
import { sendTransferPromotionEmail } from '../email'

// 指定した開催日のキャンセル待ちを、空き枠がある範囲で繰り上げ
export async function promoteWaitlistForClassDate(classDateId: string): Promise<void> {
  const waitlistsCollection = await getWaitlistsCollection()
  const attendancesCollection = await getAttendancesCollection()
  const classesCollection = await getClassesCollection()
  const classDatesCollection = await getClassDatesCollection()
  const ticketsCollection = await getTransferTicketsCollection()

  const classDate = await classDatesCollection.findOne({ id: classDateId })
  if (!classDate) return

  const classInfo = await classesCollection.findOne({ id: classDate.class_id })
  if (!classInfo) return

  // 現在の出席者数
  const attendingCount = await attendancesCollection.countDocuments({
    class_date_id: classDateId,
    status: 'attending',
  })

  let remainingCapacity = classInfo.capacity - attendingCount
  if (remainingCapacity <= 0) return

  // 待機中のキャンセル待ちを順番で取得
  const waitlistEntries = await waitlistsCollection
    .find({ class_date_id: classDateId, status: 'waiting' })
    .sort({ position: 1, created_at: 1 })
    .toArray()

  for (const entry of waitlistEntries) {
    if (remainingCapacity <= 0) break

    // 対応する振替チケットを取得
    let ticket: TransferTicket | null = null
    if (entry.ticket_id) {
      ticket = await ticketsCollection.findOne({ id: entry.ticket_id })
    } else {
      ticket = await ticketsCollection.findOne({
        member_id: entry.member_id,
        status: 'unused',
        expires_at: { $gt: new Date() },
      })
    }

    if (!ticket || ticket.status !== 'unused') {
      // チケットが無効な場合はスキップし、待機中ステータスだけ更新
      await waitlistsCollection.updateOne(
        { id: entry.id },
        { $set: { status: 'expired', expired_at: new Date(), updated_at: new Date() } }
      )
      continue
    }

    // 出席を作成
    const attendance: Attendance = {
      id: `attendance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      member_id: entry.member_id,
      class_date_id: classDateId,
      status: 'attending',
      registered_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    }

    await attendancesCollection.insertOne(attendance)

    // チケットを使用済みに更新
    await ticketsCollection.updateOne(
      { id: ticket.id },
      {
        $set: {
          status: 'used',
          used_class_date_id: classDateId,
          used_at: new Date(),
          updated_at: new Date(),
        },
      }
    )

    // キャンセル待ちを確定に更新
    await waitlistsCollection.updateOne(
      { id: entry.id },
      {
        $set: {
          status: 'confirmed',
          confirmed_at: new Date(),
          updated_at: new Date(),
        },
      }
    )

    // 繰り上げ時メール通知
    const membersCollection = await getMembersCollection()
    const member = await membersCollection.findOne({ id: entry.member_id })
    if (member?.email) {
      const dateStr = classDate.date
        ? new Date(classDate.date).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          })
        : ''
      await sendTransferPromotionEmail(
        member.email,
        member.name,
        classInfo.name,
        dateStr,
        classInfo.start_time || ''
      )
    }

    remainingCapacity -= 1
  }
}

