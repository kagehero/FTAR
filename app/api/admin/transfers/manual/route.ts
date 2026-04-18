import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getTransferTicketsCollection,
  getClassDatesCollection,
  getClassesCollection,
  getAttendancesCollection,
} from '@/lib/db'
import type { TransferTicket, Attendance } from '@/lib/models'
import { computeTransferTicketExpiryFromAbsenceDate } from '@/lib/transfer-expiry'

// 手動で振替チケットを付与
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: '認証されていません' },
        { status: 401 }
      )
    }

    const user = await getCurrentUser(token)
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '権限がありません' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { memberId, classDateId, expiresAt, markAbsent } = body

    if (!memberId || !classDateId) {
      return NextResponse.json(
        { success: false, error: '会員IDと開催日IDは必須です' },
        { status: 400 }
      )
    }

    const classDatesCollection = await getClassDatesCollection()
    const classDate = await classDatesCollection.findOne({ id: classDateId })

    if (!classDate) {
      return NextResponse.json(
        { success: false, error: '開催日が見つかりません' },
        { status: 404 }
      )
    }

    const ticketsCollection = await getTransferTicketsCollection()

    const existingUnused = await ticketsCollection.findOne({
      member_id: memberId,
      class_date_id: classDateId,
      status: 'unused',
    })
    if (existingUnused) {
      return NextResponse.json(
        {
          success: false,
          error: 'この会員・この開催日の未使用振替チケットが既にあります',
        },
        { status: 400 }
      )
    }

    // 有効期限（未指定時は欠席開催日から2ヶ月後の同日終日）
    let expiryDate: Date
    if (expiresAt) {
      expiryDate = new Date(expiresAt)
    } else {
      expiryDate = computeTransferTicketExpiryFromAbsenceDate(new Date(classDate.date))
    }

    const ticket: TransferTicket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      member_id: memberId,
      class_date_id: classDateId,
      issued_at: new Date(),
      expires_at: expiryDate,
      status: 'unused',
      created_at: new Date(),
      updated_at: new Date(),
    }

    await ticketsCollection.insertOne(ticket)

    if (markAbsent === true) {
      const attendancesCollection = await getAttendancesCollection()
      const existing = await attendancesCollection.findOne({
        member_id: memberId,
        class_date_id: classDateId,
      })
      const now = new Date()
      const attendanceData: Attendance = {
        id:
          existing?.id ||
          `attendance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        member_id: memberId,
        class_date_id: classDateId,
        status: 'absent',
        registered_at: now,
        changed_by: user.id,
        created_at: existing?.created_at || now,
        updated_at: now,
      }
      if (existing) {
        await attendancesCollection.updateOne({ id: existing.id }, { $set: attendanceData })
      } else {
        await attendancesCollection.insertOne(attendanceData)
      }
    }

    return NextResponse.json({
      success: true,
      ticket,
      message:
        markAbsent === true
          ? '振替チケットを発行し、欠席を登録しました'
          : '振替チケットを発行しました',
    })
  } catch (error) {
    console.error('Manual transfer ticket error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
