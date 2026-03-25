import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { getCurrentUser } from '@/lib/auth'
import { getMembersCollection } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'

function generateTemporaryPassword(length = 12): string {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(length)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

// 管理者による会員パスワード再設定
export async function POST(
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

    const admin = await getCurrentUser(token)
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '権限がありません' },
        { status: 403 }
      )
    }

    const { id: memberId } = await context.params
    let sendEmail = true
    try {
      const body = await request.json()
      if (typeof body?.sendEmail === 'boolean') sendEmail = body.sendEmail
    } catch {
      // empty body OK
    }

    const membersCollection = await getMembersCollection()
    const member = await membersCollection.findOne({ id: memberId, is_deleted: { $ne: true } })

    if (!member) {
      return NextResponse.json(
        { success: false, error: '会員が見つかりません' },
        { status: 404 }
      )
    }

    const plainPassword = generateTemporaryPassword()
    const hashedPassword = await bcrypt.hash(plainPassword, 10)

    await membersCollection.updateOne(
      { id: memberId },
      { $set: { password: hashedPassword, updated_at: new Date() } }
    )

    let emailSent = false
    if (sendEmail && member.email) {
      try {
        await sendPasswordResetEmail(member.email, member.name, plainPassword)
        emailSent = true
      } catch (e) {
        console.error('Password reset email failed:', e)
      }
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'パスワードを再設定し、メールを送信しました'
        : sendEmail
          ? 'パスワードを再設定しました（メール送信に失敗した可能性があります。下記を会員へお伝えください）'
          : 'パスワードを再設定しました',
      temporaryPassword: plainPassword,
      emailSent,
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
