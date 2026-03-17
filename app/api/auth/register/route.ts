import { NextRequest, NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'
import { registerWithEmail, generateRandomPassword } from '@/lib/auth'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM = process.env.SENDGRID_FROM

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, grade } = body
    console.log('email', email)
    console.log('password', password)
    console.log('name', name)
    console.log('grade', grade)

    if (!email || !name || !grade) {
      return NextResponse.json(
        { success: false, error: 'すべての項目を入力してください' },
        { status: 400 }
      )
    }

    const isPasswordProvided = typeof password === 'string' && password.length > 0
    const rawPassword = isPasswordProvided ? password : generateRandomPassword(10)

    if (isPasswordProvided && typeof password === 'string' && password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'パスワードは6文字以上で入力してください' },
        { status: 400 }
      )
    }

    const result = await registerWithEmail(email, rawPassword, name, grade)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    // 自動生成したパスワードの場合はメールで通知
    if (!isPasswordProvided) {
      try {
        if (!SENDGRID_API_KEY || !SENDGRID_FROM) {
          console.warn(
            'Password email not sent: SENDGRID_API_KEY or SENDGRID_FROM is not configured.'
          )
        } else {
          await sgMail.send({
            to: email,
            from: SENDGRID_FROM as string,
            subject: '【FTAR】会員用パスワードのご案内',
            text:
              `この度はご登録ありがとうございます。\n\n` +
              `以下のパスワードでログインいただけます。\n\n` +
              `ログイン用メールアドレス: ${email}\n` +
              `初期パスワード: ${rawPassword}\n\n` +
              `セキュリティのため、ログイン後にマイページからパスワードの変更をお願いいたします。`,
          })
        }
      } catch (mailError) {
        console.error('Failed to send password email:', mailError)
      }
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
