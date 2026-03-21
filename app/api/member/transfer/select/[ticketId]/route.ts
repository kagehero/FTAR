import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getTransferTicketsCollection,
  getClassDatesCollection,
  getClassesCollection,
  getAttendancesCollection,
  getWaitlistsCollection,
} from '@/lib/db'
import type { Attendance, Waitlist } from '@/lib/models'
import { promoteWaitlistForClassDate } from '@/lib/services/waitlist-service'
import { TRANSFER_CATEGORY_RULES, TRANSFER_DEADLINE_HOURS } from '@/lib/constants'

// 候補開催日の取得
export async function GET(
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
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 401 }
      )
    }

    const { ticketId } = await context.params
    const ticketsCollection = await getTransferTicketsCollection()
    const classDatesCollection = await getClassDatesCollection()
    const classesCollection = await getClassesCollection()
    const attendancesCollection = await getAttendancesCollection()
    const waitlistsCollection = await getWaitlistsCollection()

    const ticket = await ticketsCollection.findOne({ id: ticketId, member_id: user.id })
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'チケットが見つかりません' },
        { status: 404 }
      )
    }

    if (ticket.status !== 'unused') {
      return NextResponse.json(
        { success: false, error: 'このチケットは使用できません' },
        { status: 400 }
      )
    }

    const now = new Date()
    if (ticket.expires_at < now) {
      return NextResponse.json(
        { success: false, error: 'このチケットは有効期限切れです' },
        { status: 400 }
      )
    }

    // 欠席元クラス情報を取得（学年・カテゴリ合わせに利用）
    const originalClassDate = await classDatesCollection.findOne({ id: ticket.class_date_id })
    const originalClass = originalClassDate
      ? await classesCollection.findOne({ id: originalClassDate.class_id })
      : null

    // 今後の開催日から候補を取得（休講日は除外）
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const futureClassDates = await classDatesCollection
      .find({
        date: { $gte: today },
        is_cancelled: false,
        $or: [
          { session_status: { $exists: false } },
          { session_status: 'scheduled' },
        ],
      })
      .toArray()

    const sourceCategory = originalClass?.category || 'その他'
    const allowedTargetCategories = TRANSFER_CATEGORY_RULES[sourceCategory] ?? [sourceCategory]

    const options = await Promise.all(
      futureClassDates.map(async (cd) => {
        const cls = await classesCollection.findOne({ id: cd.class_id })
        if (!cls || !cls.allow_transfer || !cls.is_active) return null

        // 振替可否（特待→全OK、特化→強化NG、同一カテゴリ→OK）
        if (!allowedTargetCategories.includes(cls.category)) return null

        // 締切：開始1時間前
        const classDateTime = new Date(cd.date)
        const [h, m] = cls.start_time.split(':').map(Number)
        classDateTime.setHours(h, m, 0, 0)
        const deadline = new Date(classDateTime.getTime() - TRANSFER_DEADLINE_HOURS * 60 * 60 * 1000)
        if (now > deadline) return null

        // 出席者数と待機人数を計算
        const attendingCount = await attendancesCollection.countDocuments({
          class_date_id: cd.id,
          status: 'attending',
        })

        const waitCount = await waitlistsCollection.countDocuments({
          class_date_id: cd.id,
          status: 'waiting',
        })

        const hasCapacity = attendingCount < cls.capacity

        return {
          classDate: cd,
          class: cls,
          attendingCount,
          waitCount,
          hasCapacity,
        }
      })
    )

    const validOptions = options.filter((o) => o !== null)

    return NextResponse.json({
      success: true,
      ticket,
      options: validOptions,
    })
  } catch (error) {
    console.error('Get transfer options error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 振替先確定
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

    const body = await request.json()
    const { classDateId } = body

    if (!classDateId) {
      return NextResponse.json(
        { success: false, error: '振替先の開催日が指定されていません' },
        { status: 400 }
      )
    }

    const { ticketId } = await context.params
    const ticketsCollection = await getTransferTicketsCollection()
    const classDatesCollection = await getClassDatesCollection()
    const classesCollection = await getClassesCollection()
    const attendancesCollection = await getAttendancesCollection()
    const waitlistsCollection = await getWaitlistsCollection()

    const ticket = await ticketsCollection.findOne({ id: ticketId, member_id: user.id })
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'チケットが見つかりません' },
        { status: 404 }
      )
    }

    if (ticket.status !== 'unused') {
      return NextResponse.json(
        { success: false, error: 'このチケットは使用できません' },
        { status: 400 }
      )
    }

    const now = new Date()
    if (ticket.expires_at < now) {
      return NextResponse.json(
        { success: false, error: 'このチケットは有効期限切れです' },
        { status: 400 }
      )
    }

    const classDate = await classDatesCollection.findOne({ id: classDateId })
    if (!classDate || classDate.is_cancelled || classDate.session_status === 'holiday') {
      return NextResponse.json(
        { success: false, error: '選択された開催日は利用できません' },
        { status: 400 }
      )
    }

    const classInfo = await classesCollection.findOne({ id: classDate.class_id })
    if (!classInfo) {
      return NextResponse.json(
        { success: false, error: 'クラス情報が見つかりません' },
        { status: 404 }
      )
    }

    if (!classInfo.allow_transfer) {
      return NextResponse.json(
        { success: false, error: 'このクラスは振替対象外です' },
        { status: 400 }
      )
    }

    // 締切：開始1時間前
    const classDateTime = new Date(classDate.date)
    const [h, m] = classInfo.start_time.split(':').map(Number)
    classDateTime.setHours(h, m, 0, 0)
    const deadline = new Date(classDateTime.getTime() - TRANSFER_DEADLINE_HOURS * 60 * 60 * 1000)
    if (now > deadline) {
      return NextResponse.json(
        { success: false, error: '振替の締切（開始1時間前）を過ぎています' },
        { status: 400 }
      )
    }

    // 振替可否（カテゴリルール）
    const originalClassDate = await classDatesCollection.findOne({ id: ticket.class_date_id })
    const originalClass = originalClassDate
      ? await classesCollection.findOne({ id: originalClassDate.class_id })
      : null
    const sourceCategory = originalClass?.category || 'その他'
    const allowedTargetCategories = TRANSFER_CATEGORY_RULES[sourceCategory] ?? [sourceCategory]
    if (!allowedTargetCategories.includes(classInfo.category)) {
      return NextResponse.json(
        { success: false, error: 'このクラスへの振替はできません（カテゴリ制限）' },
        { status: 400 }
      )
    }

    // 現在の出席者数
    const attendingCount = await attendancesCollection.countDocuments({
      class_date_id: classDateId,
      status: 'attending',
    })

    const hasCapacity = attendingCount < classInfo.capacity

    if (hasCapacity) {
      // 即確定: 出席作成 + チケット使用済み
      const attendance: Attendance = {
        id: `attendance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        member_id: user.id,
        class_date_id: classDateId,
        status: 'attending',
        registered_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      }

      await attendancesCollection.insertOne(attendance)

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

      return NextResponse.json({
        success: true,
        status: 'confirmed',
        message: '振替が確定しました',
      })
    }

    // 満席 → キャンセル待ちへ
    const existingWait = await waitlistsCollection.findOne({
      member_id: user.id,
      class_date_id: classDateId,
    })

    if (existingWait) {
      return NextResponse.json({
        success: true,
        status: 'waiting',
        message: '既にこのクラスのキャンセル待ちに登録されています',
      })
    }

    const waitCount = await waitlistsCollection.countDocuments({
      class_date_id: classDateId,
    })

    const waitEntry: Waitlist = {
      id: `wait_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      member_id: user.id,
      ticket_id: ticket.id,
      class_date_id: classDateId,
      position: waitCount + 1,
      status: 'waiting',
      created_at: new Date(),
      updated_at: new Date(),
    }

    await waitlistsCollection.insertOne(waitEntry)

    return NextResponse.json({
      success: true,
      status: 'waiting',
      message: '満席のため、キャンセル待ちに登録しました',
      position: waitEntry.position,
    })
  } catch (error) {
    console.error('Confirm transfer error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

