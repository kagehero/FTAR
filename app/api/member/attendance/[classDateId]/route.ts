import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getClassDatesCollection,
  getClassesCollection,
  getAttendancesCollection,
  getTransferTicketsCollection,
} from '@/lib/db'
import type { Attendance, TransferTicket } from '@/lib/models'
import { promoteWaitlistForClassDate } from '@/lib/services/waitlist-service'
import { TRANSFER_LIMIT_PER_MONTH } from '@/lib/constants'
import { computeTransferTicketExpiryFromAbsenceDate } from '@/lib/transfer-expiry'

// 出欠登録
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ classDateId: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: '認証されていません' },
        { status: 401 }
      )
    }

    const user = await getCurrentUser(token)
    if (!user || user.role !== 'member') {
      return NextResponse.json(
        { success: false, error: '権限がありません' },
        { status: 403 }
      )
    }

    const { classDateId } = await context.params

    const body = await request.json()
    const { status } = body

    if (!status || !['attending', 'absent'].includes(status)) {
      return NextResponse.json(
        { success: false, error: '無効な出欠ステータスです' },
        { status: 400 }
      )
    }

    // 開催日情報を取得
    const classDatesCollection = await getClassDatesCollection()
    const classDate = await classDatesCollection.findOne({ id: classDateId })

    if (!classDate) {
      return NextResponse.json(
        { success: false, error: '開催日が見つかりません' },
        { status: 404 }
      )
    }

    if (classDate.is_cancelled) {
      return NextResponse.json(
        { success: false, error: 'このクラスは中止されています' },
        { status: 400 }
      )
    }

    // クラス情報を取得
    const classesCollection = await getClassesCollection()
    const classInfo = await classesCollection.findOne({ id: classDate.class_id })

    if (!classInfo) {
      return NextResponse.json(
        { success: false, error: 'クラス情報が見つかりません' },
        { status: 404 }
      )
    }

    // 開始時間をチェック（1時間前制限）
    const classDateTime = new Date(classDate.date)
    const [hours, minutes] = classInfo.start_time.split(':').map(Number)
    classDateTime.setHours(hours, minutes, 0, 0)

    const now = new Date()
    const oneHourBefore = new Date(classDateTime.getTime() - 60 * 60 * 1000)

    if (now > oneHourBefore) {
      return NextResponse.json(
        { success: false, error: '開始1時間前までに出欠登録してください' },
        { status: 400 }
      )
    }

    const attendancesCollection = await getAttendancesCollection()

    // 既存の出欠を確認
    const existingAttendance = await attendancesCollection.findOne({
      member_id: user.id,
      class_date_id: classDateId,
    })

    const attendanceData: Attendance = {
      id: existingAttendance?.id || `attendance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      member_id: user.id,
      class_date_id: classDateId,
      status: status as 'attending' | 'absent',
      registered_at: new Date(),
      created_at: existingAttendance?.created_at || new Date(),
      updated_at: new Date(),
    }

    const previousStatus = existingAttendance?.status

    if (existingAttendance) {
      await attendancesCollection.updateOne(
        { id: existingAttendance.id },
        { $set: attendanceData }
      )
    } else {
      await attendancesCollection.insertOne(attendanceData)
    }

    // 欠席の場合、振替チケットを発行（月1回まで・自己都合のみ）
    if (status === 'absent' && classInfo.allow_transfer) {
      const ticketsCollection = await getTransferTicketsCollection()

      const existingTicket = await ticketsCollection.findOne({
        member_id: user.id,
        class_date_id: classDateId,
        status: 'unused',
      })

      if (!existingTicket) {
        // 月1回まで（自己都合）。今月の使用済み振替回数をチェック
        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)
        const usedThisMonth = await ticketsCollection.countDocuments({
          member_id: user.id,
          status: 'used',
          used_at: { $gte: monthStart },
        })
        if (usedThisMonth >= TRANSFER_LIMIT_PER_MONTH) {
          // 月制限超過のため振替チケットは発行しない（欠席登録自体は成功）
        } else {
          const expiresAt = computeTransferTicketExpiryFromAbsenceDate(new Date(classDate.date))

          const ticket: TransferTicket = {
            id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            member_id: user.id,
            class_date_id: classDateId,
            issued_at: new Date(),
            expires_at: expiresAt,
            status: 'unused',
            created_at: new Date(),
            updated_at: new Date(),
          }
          await ticketsCollection.insertOne(ticket)
        }
      }
    }

    // 出席 → 欠席 に変更された場合、空きができるのでキャンセル待ちを繰り上げ
    if (previousStatus === 'attending' && status === 'absent') {
      await promoteWaitlistForClassDate(classDateId)
    }

    // 欠席 → 出席 に変更された場合、未使用チケットを失効
    if (previousStatus === 'absent' && status === 'attending') {
      const ticketsCollection = await getTransferTicketsCollection()
      await ticketsCollection.updateMany(
        { member_id: user.id, class_date_id: classDateId, status: 'unused' },
        { $set: { status: 'expired', updated_at: new Date() } }
      )
    }

    return NextResponse.json({
      success: true,
      message: '出欠を登録しました',
    })
  } catch (error) {
    console.error('Attendance registration error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
