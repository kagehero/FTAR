import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getWaitlistsCollection } from '@/lib/db'

// キャンセル待ちの解除
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
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 401 }
      )
    }

    const { id: waitlistId } = await context.params

    const waitlistsCollection = await getWaitlistsCollection()
    const entry = await waitlistsCollection.findOne({
      id: waitlistId,
      member_id: user.id,
    })

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'キャンセル待ちが見つかりません' },
        { status: 404 }
      )
    }

    if (entry.status !== 'waiting') {
      return NextResponse.json(
        { success: false, error: '既に確定または失効しています' },
        { status: 400 }
      )
    }

    await waitlistsCollection.updateOne(
      { id: waitlistId },
      { $set: { status: 'expired', expired_at: new Date(), updated_at: new Date() } }
    )

    return NextResponse.json({
      success: true,
      message: 'キャンセル待ちを解除しました。チケットは未使用のままです。別のクラスを選択できます。',
    })
  } catch (error) {
    console.error('Cancel waitlist error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
