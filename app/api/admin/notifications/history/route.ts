import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getNotificationLogsCollection } from '@/lib/db'

// 配信履歴取得
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

    const notificationLogsCollection = await getNotificationLogsCollection()

    const logs = await notificationLogsCollection
      .find({})
      .sort({ sent_at: -1 })
      .limit(100)
      .toArray()

    return NextResponse.json({
      success: true,
      logs,
    })
  } catch (error) {
    console.error('Get notification history error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
