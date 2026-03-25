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
import { syncAttendancesForEnrolledClasses } from '@/lib/services/enrollment-service'

// 会員詳細取得
export async function GET(
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

    const { id: memberId } = await context.params
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

    const { id: memberId } = await context.params
    const body = await request.json()
    const { name, grade, phone, status, is_active, enrolled_class_ids, transfer_allowed_class_ids } =
      body

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
    if (enrolled_class_ids !== undefined) {
      if (Array.isArray(enrolled_class_ids) && enrolled_class_ids.every((x) => typeof x === 'string')) {
        updateData.enrolled_class_ids = Array.from(new Set(enrolled_class_ids.map((s) => s.trim()).filter(Boolean)))
      } else {
        return NextResponse.json(
          { success: false, error: '参加クラスの形式が正しくありません' },
          { status: 400 }
        )
      }
    }
    if (transfer_allowed_class_ids !== undefined) {
      if (Array.isArray(transfer_allowed_class_ids) && transfer_allowed_class_ids.every((x) => typeof x === 'string')) {
        updateData.transfer_allowed_class_ids = Array.from(
          new Set(transfer_allowed_class_ids.map((s) => s.trim()).filter(Boolean))
        )
      } else {
        return NextResponse.json(
          { success: false, error: '振替許可クラスの形式が正しくありません' },
          { status: 400 }
        )
      }
    }

    await membersCollection.updateOne({ id: memberId }, { $set: updateData })

    if (enrolled_class_ids !== undefined && updateData.enrolled_class_ids) {
      try {
        await syncAttendancesForEnrolledClasses(memberId, updateData.enrolled_class_ids)
      } catch (e) {
        console.error('Sync attendances for enrolled classes error:', e)
      }
    }

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

// 会員削除（ソフトデリート）
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

    const { id: memberId } = await context.params

    const membersCollection = await getMembersCollection()
    const member = await membersCollection.findOne({ id: memberId })

    if (!member) {
      return NextResponse.json(
        { success: false, error: '会員が見つかりません' },
        { status: 404 }
      )
    }

    await membersCollection.updateOne(
      { id: memberId },
      {
        $set: {
          is_deleted: true,
          status: 'withdrawn',
          is_active: false,
          updated_at: new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: '会員を削除しました',
    })
  } catch (error) {
    console.error('Delete member error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
