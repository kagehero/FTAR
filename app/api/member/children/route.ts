import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getCurrentUser, addChildForParent, listChildrenForParent } from '@/lib/auth'
import { syncAttendancesForEnrolledClasses } from '@/lib/services/enrollment-service'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '認証されていません' }, { status: 401 })
    }
    const decoded = verifyToken(token)
    if (!decoded?.parentId) {
      return NextResponse.json({ success: true, children: [], isParentSession: false })
    }
    const children = await listChildrenForParent(decoded.parentId)
    return NextResponse.json({
      success: true,
      children,
      isParentSession: true,
      parentId: decoded.parentId,
    })
  } catch (error) {
    console.error('List children error:', error)
    return NextResponse.json({ success: false, error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '認証されていません' }, { status: 401 })
    }
    const user = await getCurrentUser(token)
    const decoded = verifyToken(token)
    if (!user?.parent_id && !decoded?.parentId) {
      return NextResponse.json(
        { success: false, error: 'お子様の追加は保護者ログイン中のみ可能です' },
        { status: 403 }
      )
    }

    const parentId = user?.parent_id ?? decoded?.parentId
    if (!parentId) {
      return NextResponse.json({ success: false, error: '不正なリクエストです' }, { status: 400 })
    }

    const body = await request.json()
    const { name, grade } = body
    if (!name?.trim() || !grade?.trim()) {
      return NextResponse.json({ success: false, error: '氏名と学年を入力してください' }, { status: 400 })
    }

    const result = await addChildForParent(parentId, name.trim(), grade.trim())
    if (!result.success || !result.member) {
      return NextResponse.json({ success: false, error: result.error || '登録に失敗しました' }, { status: 400 })
    }

    const m = result.member
    try {
      if (m.enrolled_class_ids?.length) {
        await syncAttendancesForEnrolledClasses(m.id, m.enrolled_class_ids)
      }
    } catch (e) {
      console.error('sync attendances new child:', e)
    }

    const { password: _, ...out } = m
    return NextResponse.json({ success: true, member: out })
  } catch (error) {
    console.error('Add child error:', error)
    return NextResponse.json({ success: false, error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
