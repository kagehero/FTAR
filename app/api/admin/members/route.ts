import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getMembersCollection } from '@/lib/db'

// 会員一覧取得
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

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const grade = searchParams.get('grade')
    const status = searchParams.get('status')

    const membersCollection = await getMembersCollection()

    const query: any = {
      role: 'member',
      is_deleted: false,
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }

    if (grade) {
      query.grade = grade
    }

    if (status) {
      if (status === 'active') {
        query.is_active = true
        query.status = 'active'
      } else if (status === 'suspended') {
        query.status = 'suspended'
      } else if (status === 'withdrawn') {
        query.is_deleted = true
      }
    }

    const members = await membersCollection
      .find(query)
      .sort({ created_at: -1 })
      .limit(100)
      .toArray()

    // パスワードを除外
    const membersWithoutPassword = members.map(({ password, ...member }) => member)

    return NextResponse.json({
      success: true,
      members: membersWithoutPassword,
    })
  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
