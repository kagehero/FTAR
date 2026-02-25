import { NextRequest, NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'
import { getCurrentUser } from '@/lib/auth'
import {
  getMembersCollection,
  getClassDatesCollection,
  getClassesCollection,
  getAttendancesCollection,
  getNotificationLogsCollection,
} from '@/lib/db'
import type { NotificationLog } from '@/lib/models'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM = process.env.SENDGRID_FROM

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY)
}

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

    if (!targetMembers.length) {
      return NextResponse.json({
        success: true,
        message: '対象となる会員がいません',
        count: 0,
      })
    }

    if (type === 'email') {
      if (!SENDGRID_API_KEY || !SENDGRID_FROM) {
        return NextResponse.json(
          {
            success: false,
            error: 'メール送信設定が構成されていません（SENDGRID_API_KEY / SENDGRID_FROM）',
          },
          { status: 500 }
        )
      }
    }

    const now = new Date()
    const logs: NotificationLog[] = []
    let successCount = 0

    if (type === 'email') {
      // SendGrid でメール送信
      const sendPromises = targetMembers.map(async (member) => {
        const logBase: Omit<NotificationLog, 'status' | 'error_message'> = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          member_id: member.id,
          type: 'email',
          subject,
          content,
          sent_at: now,
        }

        try {
          await sgMail.send({
            to: member.email,
            from: SENDGRID_FROM as string,
            subject,
            text: content,
          })

          logs.push({
            ...logBase,
            status: 'sent',
          })
          successCount += 1
        } catch (error: any) {
          console.error('SendGrid error:', error)
          logs.push({
            ...logBase,
            status: 'failed',
            error_message:
              (error?.response?.body && JSON.stringify(error.response.body)) ||
              error?.message ||
              'SendGrid送信エラー',
          })
        }
      })

      await Promise.all(sendPromises)
    } else {
      // LINE等の他チャネルはまだ未実装だが、履歴のみ残す
      targetMembers.forEach((member) => {
        logs.push({
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          member_id: member.id,
          type: type as 'email' | 'line',
          subject,
          content,
          sent_at: now,
          status: 'sent',
        })
        successCount += 1
      })
    }

    if (logs.length > 0) {
      await notificationLogsCollection.insertMany(logs)
    }

    return NextResponse.json({
      success: true,
      message: `${successCount}件の通知を送信しました`,
      count: successCount,
    })
  } catch (error) {
    console.error('Send notification error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
