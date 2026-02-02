import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getTransferTicketsCollection,
  getClassDatesCollection,
  getClassesCollection,
  getMembersCollection,
} from '@/lib/db'

// 振替履歴一覧取得
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
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '権限がありません' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const status = searchParams.get('status')

    const ticketsCollection = await getTransferTicketsCollection()
    const classDatesCollection = await getClassDatesCollection()
    const classesCollection = await getClassesCollection()
    const membersCollection = await getMembersCollection()

    const query: any = {}
    if (memberId) {
      query.member_id = memberId
    }
    if (status) {
      query.status = status
    }

    const tickets = await ticketsCollection
      .find(query)
      .sort({ issued_at: -1 })
      .limit(100)
      .toArray()

    const result = await Promise.all(
      tickets.map(async (ticket) => {
        const member = await membersCollection.findOne({ id: ticket.member_id })
        const originalClassDate = await classDatesCollection.findOne({
          id: ticket.class_date_id,
        })
        const originalClass = originalClassDate
          ? await classesCollection.findOne({ id: originalClassDate.class_id })
          : null

        let usedClass = null
        if (ticket.used_class_date_id) {
          const usedClassDate = await classDatesCollection.findOne({
            id: ticket.used_class_date_id,
          })
          if (usedClassDate) {
            usedClass = await classesCollection.findOne({ id: usedClassDate.class_id })
          }
        }

        return {
          ...ticket,
          member,
          originalClass,
          originalClassDate,
          usedClass,
        }
      })
    )

    return NextResponse.json({
      success: true,
      transfers: result,
    })
  } catch (error) {
    console.error('Get transfers error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
