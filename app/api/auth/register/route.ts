import { NextRequest, NextResponse } from 'next/server'
import { registerWithEmail } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, grade } = body
    console.log('email', email)
    console.log('password', password)
    console.log('name', name)
    console.log('grade', grade)

    if (!email || !password || !name || !grade) {
      return NextResponse.json(
        { success: false, error: 'すべての項目を入力してください' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'パスワードは6文字以上で入力してください' },
        { status: 400 }
      )
    }

    const result = await registerWithEmail(email, password, name, grade)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    // トークンをCookieに設定
    const response = NextResponse.json({
      success: true,
      user: result.user,
    })

    response.cookies.set('auth-token', result.token || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7日
    })

    return response
  } catch (error) {
    console.error('Register API error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
