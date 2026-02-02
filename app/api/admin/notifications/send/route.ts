import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getMembersCollection,
  getClassDatesCollection,
  getClassesCollection,
  getAttendancesCollection,
  getNotificationLogsCollection,
} from '@/lib/db'
import type { NotificationLog } from '@/lib/models'

// メール配信
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
    const { target, classDateId, subject, content, type = 'email' } = body

    if (!target || !subject || !content) {
      return NextResponse.json(
        { success: false, error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    const membersCollection = await getMembersCollection()
    const notificationLogsCollection = await getNotificationLogsCollection()

    let targetMembers: any[] = []

    if (target === 'all') {
      // 全会員
      targetMembers = await membersCollection
        .find({ role: 'member', is_active: true, is_deleted: false })
        .toArray()
    } else if (target === 'class') {
      // 特定クラスの出席者
      if (!classDateId) {
        return NextResponse.json(
          { success: false, error: 'クラスIDが必要です' },
          { status: 400 }
        )
      }

      const attendancesCollection = await getAttendancesCollection()
      const attendances = await attendancesCollection
        .find({ class_date_id: classDateId, status: 'attending' })
        .toArray()

      const memberIds = attendances.map((a) => a.member_id)
      targetMembers = await membersCollection
        .find({ id: { $in: memberIds } })
        .toArray()
    } else if (target === 'absent') {
      // 欠席者
      if (!classDateId) {
        return NextResponse.json(
          { success: false, error: 'クラスIDが必要です' },
          { status: 400 }
        )
      }

      const attendancesCollection = await getAttendancesCollection()
      const attendances = await attendancesCollection
        .find({ class_date_id: classDateId, status: 'absent' })
        .toArray()

      const memberIds = attendances.map((a) => a.member_id)
      targetMembers = await membersCollection
        .find({ id: { $in: memberIds } })
        .toArray()
    }

    // 通知ログを作成
    const logs: NotificationLog[] = targetMembers.map((member) => ({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      member_id: member.id,
      type: type as 'email' | 'line',
      subject,
      content,
      sent_at: new Date(),
      status: 'sent',
      created_at: new Date(),
      updated_at: new Date(),
    }))

    if (logs.length > 0) {
      await notificationLogsCollection.insertMany(logs)
    }

    // 実際のメール送信はここで実装
    // 例: nodemailer, SendGrid, AWS SES など
    // 今回はログのみ記録

    return NextResponse.json({
      success: true,
      message: `${targetMembers.length}件の通知を送信しました`,
      count: targetMembers.length,
    })
  } catch (error) {
    console.error('Send notification error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
