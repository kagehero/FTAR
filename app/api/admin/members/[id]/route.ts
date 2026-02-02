import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getMembersCollection,
  getAttendancesCollection,
  getTransferTicketsCollection,
  getClassDatesCollection,
  getClassesCollection,
  getNotificationLogsCollection,
} from '@/lib/db'

// 会員詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const memberId = params.id
    const membersCollection = await getMembersCollection()
    const member = await membersCollection.findOne({ id: memberId })

    if (!member) {
      return NextResponse.json(
        { success: false, error: '会員が見つかりません' },
        { status: 404 }
      )
    }

    // 出席履歴
    const attendancesCollection = await getAttendancesCollection()
    const attendances = await attendancesCollection
      .find({ member_id: memberId })
      .sort({ registered_at: -1 })
      .limit(50)
      .toArray()

    // 振替履歴
    const ticketsCollection = await getTransferTicketsCollection()
    const tickets = await ticketsCollection
      .find({ member_id: memberId })
      .sort({ issued_at: -1 })
      .limit(50)
      .toArray()

    // 通知履歴
    const notificationLogsCollection = await getNotificationLogsCollection()
    const notifications = await notificationLogsCollection
      .find({ member_id: memberId })
      .sort({ sent_at: -1 })
      .limit(20)
      .toArray()

    // クラス情報を取得
    const classDatesCollection = await getClassDatesCollection()
    const classesCollection = await getClassesCollection()

    const attendancesWithDetails = await Promise.all(
      attendances.map(async (att) => {
        const classDate = await classDatesCollection.findOne({ id: att.class_date_id })
        const classInfo = classDate
          ? await classesCollection.findOne({ id: classDate.class_id })
          : null
        return {
          ...att,
          classDate,
          class: classInfo,
        }
      })
    )

    const ticketsWithDetails = await Promise.all(
      tickets.map(async (ticket) => {
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
          originalClass,
          originalClassDate,
          usedClass,
        }
      })
    )

    const { password, ...memberWithoutPassword } = member

    return NextResponse.json({
      success: true,
      member: memberWithoutPassword,
      attendances: attendancesWithDetails,
      transfers: ticketsWithDetails,
      notifications,
    })
  } catch (error) {
    console.error('Get member detail error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 会員情報更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const memberId = params.id
    const body = await request.json()
    const { name, grade, phone, status, is_active } = body

    const membersCollection = await getMembersCollection()
    const member = await membersCollection.findOne({ id: memberId })

    if (!member) {
      return NextResponse.json(
        { success: false, error: '会員が見つかりません' },
        { status: 404 }
      )
    }

    const updateData: any = {
      updated_at: new Date(),
    }

    if (name !== undefined) updateData.name = name
    if (grade !== undefined) updateData.grade = grade
    if (phone !== undefined) updateData.phone = phone
    if (status !== undefined) updateData.status = status
    if (is_active !== undefined) updateData.is_active = is_active

    await membersCollection.updateOne({ id: memberId }, { $set: updateData })

    return NextResponse.json({
      success: true,
      message: '会員情報を更新しました',
    })
  } catch (error) {
    console.error('Update member error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
