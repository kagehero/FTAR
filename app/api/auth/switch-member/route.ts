import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getCurrentUser, reissueTokenForChild } from '@/lib/auth'
import { getMembersCollection } from '@/lib/db'

// 保護者セッションで表示するお子様を切り替え
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '認証されていません' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded?.parentId) {
      return NextResponse.json(
        { success: false, error: '保護者アカウントでのみ利用できます' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { memberId } = body
    if (!memberId || typeof memberId !== 'string') {
      return NextResponse.json({ success: false, error: '会員IDを指定してください' }, { status: 400 })
    }

    const membersCollection = await getMembersCollection()
    const child = await membersCollection.findOne({
      id: memberId,
      parent_id: decoded.parentId,
      is_deleted: false,
    })
    if (!child || !child.is_active) {
      return NextResponse.json({ success: false, error: '会員が見つかりません' }, { status: 404 })
    }

    const newToken = reissueTokenForChild(decoded.email, decoded.parentId, memberId)
    const user = await getCurrentUser(newToken)

    const response = NextResponse.json({ success: true, user })
    response.cookies.set('auth-token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
    return response
  } catch (error) {
    console.error('Switch member error:', error)
    return NextResponse.json({ success: false, error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
