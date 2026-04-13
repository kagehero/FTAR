import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { getCurrentUser } from '@/lib/auth'
import { getMembersCollection, getParentsCollection } from '@/lib/db'
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

    let loginEmail = member.email
    if (member.parent_id) {
      const parentsCollection = await getParentsCollection()
      const parent = await parentsCollection.findOne({ id: member.parent_id })
      if (!parent) {
        return NextResponse.json(
          { success: false, error: '保護者アカウントが見つかりません' },
          { status: 404 }
        )
      }
      await parentsCollection.updateOne(
        { id: parent.id },
        { $set: { password: hashedPassword, updated_at: new Date() } }
      )
      loginEmail = parent.email
    } else {
      await membersCollection.updateOne(
        { id: memberId },
        { $set: { password: hashedPassword, updated_at: new Date() } }
      )
    }

    let emailSent = false
    if (sendEmail && loginEmail) {
      try {
        await sendPasswordResetEmail(loginEmail, member.name, plainPassword)
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
