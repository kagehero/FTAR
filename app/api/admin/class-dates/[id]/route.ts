import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getClassDatesCollection,
  getAttendancesCollection,
  getTransferTicketsCollection,
  getMembersCollection,
} from '@/lib/db'
import type { Attendance, TransferTicket } from '@/lib/models'

// 開催日更新
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '権限がありません' },
        { status: 403 }
      )
    }

    const { id: classDateId } = await context.params
    const body = await request.json()
    const { isCancelled, cancelledReason, autoTransferTicket, sessionStatus, note } = body

    const classDatesCollection = await getClassDatesCollection()
    const classDate = await classDatesCollection.findOne({ id: classDateId })

    if (!classDate) {
      return NextResponse.json(
        { success: false, error: '開催日が見つかりません' },
        { status: 404 }
      )
    }

    const wasCancelled = classDate.is_cancelled
    const nowCancelled =
      sessionStatus === 'cancelled' || (isCancelled ?? sessionStatus === 'cancelled')

    // 中止処理
    if (!wasCancelled && nowCancelled) {
      const attendancesCollection = await getAttendancesCollection()
      const ticketsCollection = await getTransferTicketsCollection()
      const membersCollection = await getMembersCollection()

      // 出席登録を無効化
      await attendancesCollection.updateMany(
        { class_date_id: classDateId },
        { $set: { status: 'absent', updated_at: new Date() } }
      )

      // 自動振替チケット発行
      if (autoTransferTicket) {
        const attendances = await attendancesCollection
          .find({ class_date_id: classDateId, status: 'attending' })
          .toArray()

        const now = new Date()
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + 1)
        expiresAt.setDate(0)
        expiresAt.setHours(23, 59, 59, 999)

        const tickets: TransferTicket[] = attendances.map((att) => ({
          id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          member_id: att.member_id,
          class_date_id: classDateId,
          issued_at: now,
          expires_at: expiresAt,
          status: 'unused',
          created_at: now,
          updated_at: now,
        }))

        if (tickets.length > 0) {
          await ticketsCollection.insertMany(tickets)
        }
      }
    }

    const sessionStatusVal =
      sessionStatus ?? (nowCancelled ? 'cancelled' : classDate.session_status ?? 'scheduled')
    const noteVal = note ?? cancelledReason

    await classDatesCollection.updateOne(
      { id: classDateId },
      {
        $set: {
          is_cancelled: nowCancelled,
          cancelled_reason: noteVal || cancelledReason || undefined,
          auto_transfer_ticket: autoTransferTicket ?? classDate.auto_transfer_ticket,
          session_status: sessionStatusVal,
          note: noteVal || undefined,
          updated_at: new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: '開催日を更新しました',
    })
  } catch (error) {
    console.error('Update class date error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 開催日削除
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '権限がありません' },
        { status: 403 }
      )
    }

    const { id: classDateId } = await context.params
    const classDatesCollection = await getClassDatesCollection()

    const result = await classDatesCollection.deleteOne({ id: classDateId })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: '開催日が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '開催日を削除しました',
    })
  } catch (error) {
    console.error('Delete class date error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
