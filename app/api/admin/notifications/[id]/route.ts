import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getNotificationLogsCollection } from '@/lib/db'

// 通知ログ削除
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

    const { id } = await context.params
    const notificationLogsCollection = await getNotificationLogsCollection()

    const existing = await notificationLogsCollection.findOne({ id })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '通知ログが見つかりません' },
        { status: 404 }
      )
    }

    await notificationLogsCollection.deleteOne({ id })

    return NextResponse.json({
      success: true,
      message: '通知ログを削除しました',
    })
  } catch (error) {
    console.error('Delete notification log error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

