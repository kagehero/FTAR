import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, verifyToken, listChildrenForParent } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ success: false, error: '認証されていません' }, { status: 401 })
    }

    const user = await getCurrentUser(token)
    if (!user) {
      return NextResponse.json({ success: false, error: 'ユーザーが見つかりません' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    let children: Awaited<ReturnType<typeof listChildrenForParent>> = []
    if (decoded?.parentId) {
      children = await listChildrenForParent(decoded.parentId)
    }

    return NextResponse.json({
      success: true,
      user,
      parentId: decoded?.parentId ?? null,
      children: decoded?.parentId ? children : [],
    })
  } catch (error) {
    console.error('Get current user API error:', error)
    return NextResponse.json({ success: false, error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
