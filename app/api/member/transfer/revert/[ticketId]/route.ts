import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getTransferTicketsCollection,
  getAttendancesCollection,
  getClassDatesCollection,
  getClassesCollection,
} from '@/lib/db'
import { TRANSFER_DEADLINE_HOURS } from '@/lib/constants'

// 振替の取り消し（使用済み→未使用、別の日に取り直し可能）
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> }
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

    const { ticketId } = await context.params

    const ticketsCollection = await getTransferTicketsCollection()
    const ticket = await ticketsCollection.findOne({
      id: ticketId,
      member_id: user.id,
    })

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'チケットが見つかりません' },
        { status: 404 }
      )
    }

    if (ticket.status !== 'used' || !ticket.used_class_date_id) {
      return NextResponse.json(
        { success: false, error: 'このチケットは取り消せません' },
        { status: 400 }
      )
    }

    const now = new Date()
    if (ticket.expires_at < now) {
      return NextResponse.json(
        { success: false, error: '有効期限切れのチケットは取り消せません' },
        { status: 400 }
      )
    }

    const classDatesCollection = await getClassDatesCollection()
    const classesCollection = await getClassesCollection()
    const usedClassDate = await classDatesCollection.findOne({
      id: ticket.used_class_date_id,
    })
    const usedClass = usedClassDate
      ? await classesCollection.findOne({ id: usedClassDate.class_id })
      : null

    if (!usedClassDate || !usedClass) {
      return NextResponse.json(
        { success: false, error: '振替先クラス情報が見つかりません' },
        { status: 400 }
      )
    }

    const classDateTime = new Date(usedClassDate.date)
    const [h, m] = usedClass.start_time.split(':').map(Number)
    classDateTime.setHours(h, m, 0, 0)
    const deadline = new Date(
      classDateTime.getTime() - TRANSFER_DEADLINE_HOURS * 60 * 60 * 1000
    )

    if (now > deadline) {
      return NextResponse.json(
        { success: false, error: '振替先クラスの開始1時間前を過ぎているため取り消せません' },
        { status: 400 }
      )
    }

    const attendancesCollection = await getAttendancesCollection()
    await attendancesCollection.deleteOne({
      member_id: user.id,
      class_date_id: ticket.used_class_date_id,
    })

    await ticketsCollection.updateOne(
      { id: ticketId },
      {
        $set: { status: 'unused', updated_at: new Date() },
        $unset: { used_class_date_id: '', used_at: '' },
      }
    )

    return NextResponse.json({
      success: true,
      message: '振替を取り消しました。別のクラスを選択できます。',
    })
  } catch (error) {
    console.error('Revert transfer error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
