import {
  getClassDatesCollection,
  getAttendancesCollection,
} from '../db'
import type { Attendance } from '../models'

// 会員の参加クラス登録時に、該当クラスの今後開催日に自動で出席登録する
export async function syncAttendancesForEnrolledClasses(
  memberId: string,
  enrolledClassIds: string[]
): Promise<void> {
  const classDatesCollection = await getClassDatesCollection()
  const attendancesCollection = await getAttendancesCollection()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const classId of enrolledClassIds) {
    const futureDates = await classDatesCollection
      .find({
        class_id: classId,
        date: { $gte: today },
        is_cancelled: false,
        $or: [
          { session_status: { $exists: false } },
          { session_status: 'scheduled' },
          { session_status: 'completed' },
        ],
      })
      .toArray()

    for (const cd of futureDates) {
      const existing = await attendancesCollection.findOne({
        member_id: memberId,
        class_date_id: cd.id,
      })
      if (existing) continue

      const attendance: Attendance = {
        id: `attendance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        member_id: memberId,
        class_date_id: cd.id,
        status: 'attending',
        registered_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      }
      await attendancesCollection.insertOne(attendance)
    }
  }
}
