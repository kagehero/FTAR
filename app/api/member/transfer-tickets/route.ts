import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTransferTicketsCollection, getClassDatesCollection, getClassesCollection } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: '認証されていません' },
        { status: 401 }
      )
    }

    const user = await getCurrentUser(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 401 }
      )
    }

    const ticketsCollection = await getTransferTicketsCollection()
    const classDatesCollection = await getClassDatesCollection()
    const classesCollection = await getClassesCollection()

    const tickets = await ticketsCollection
      .find({ member_id: user.id })
      .sort({ issued_at: -1 })
      .toArray()

    // チケット情報を拡張
    const ticketsWithDetails = await Promise.all(
      tickets.map(async (ticket) => {
        const classDate = await classDatesCollection.findOne({ id: ticket.class_date_id })
        if (!classDate) return null

        const classInfo = await classesCollection.findOne({ id: classDate.class_id })
        if (!classInfo) return null

        // 有効期限チェック
        const now = new Date()
        let status = ticket.status
        if (status === 'unused' && ticket.expires_at < now) {
          status = 'expired'
          // ステータスを更新
          await ticketsCollection.updateOne(
            { id: ticket.id },
            { $set: { status: 'expired', updated_at: new Date() } }
          )
        }

        let usedClassInfo = null
        if (ticket.used_class_date_id) {
          const usedClassDate = await classDatesCollection.findOne({ id: ticket.used_class_date_id })
          if (usedClassDate) {
            usedClassInfo = await classesCollection.findOne({ id: usedClassDate.class_id })
          }
        }

        return {
          ...ticket,
          status,
          class: classInfo,
          classDate,
          usedClass: usedClassInfo,
        }
      })
    )

    const validTickets = ticketsWithDetails.filter((t) => t !== null)

    return NextResponse.json({
      success: true,
      tickets: validTickets,
    })
  } catch (error) {
    console.error('Get transfer tickets error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
