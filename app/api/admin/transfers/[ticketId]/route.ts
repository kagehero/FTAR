import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTransferTicketsCollection } from '@/lib/db'

// 振替チケットの有効期限変更（未使用・失効のみ。休会延長・事務局判断など）
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> }
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

    const { ticketId } = await context.params
    const body = await request.json()
    const { expires_at } = body

    if (!expires_at || typeof expires_at !== 'string') {
      return NextResponse.json(
        { success: false, error: '有効期限（expires_at）を指定してください' },
        { status: 400 }
      )
    }

    const newExpiry = new Date(expires_at)
    if (Number.isNaN(newExpiry.getTime())) {
      return NextResponse.json(
        { success: false, error: '有効期限の日付が無効です' },
        { status: 400 }
      )
    }

    const ticketsCollection = await getTransferTicketsCollection()
    const ticket = await ticketsCollection.findOne({ id: ticketId })

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'チケットが見つかりません' },
        { status: 404 }
      )
    }

    if (ticket.status === 'used') {
      return NextResponse.json(
        { success: false, error: '使用済みチケットの有効期限は変更できません' },
        { status: 400 }
      )
    }

    const now = new Date()
    let newStatus = ticket.status
    if (newExpiry > now) {
      newStatus = 'unused'
    } else {
      newStatus = 'expired'
    }

    await ticketsCollection.updateOne(
      { id: ticketId },
      {
        $set: {
          expires_at: newExpiry,
          status: newStatus,
          updated_at: new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: '有効期限を更新しました',
      ticket: { ...ticket, expires_at: newExpiry, status: newStatus },
    })
  } catch (error) {
    console.error('Patch transfer ticket error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
