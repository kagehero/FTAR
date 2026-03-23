import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUpcomingClasses } from '@/lib/services/class-service'

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

    const { searchParams } = new URL(request.url)
    const days = Math.min( Math.max(parseInt(searchParams.get('days') || '14', 10), 1), 60)

    const classes = await getUpcomingClasses(user.id, days)

    return NextResponse.json({
      success: true,
      classes,
    })
  } catch (error) {
    console.error('Get upcoming classes error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
