import { NextRequest, NextResponse } from 'next/server'
import { loginWithEmail } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスとパスワードを入力してください' },
        { status: 400 }
      )
    }

    const result = await loginWithEmail(email, password)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
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
    console.error('Login API error:', error)
    const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました'
    
    // MongoDB接続エラーの場合は詳細を返す（開発環境のみ）
    if (errorMessage.includes('MongoDB') || errorMessage.includes('MONGODB')) {
      return NextResponse.json(
        { 
          success: false, 
          error: process.env.NODE_ENV === 'production' 
            ? 'データベース接続エラーが発生しました。管理者にお問い合わせください。' 
            : errorMessage 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
