import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getTransferTicketsCollection,
  getClassDatesCollection,
  getClassesCollection,
  getAttendancesCollection,
} from '@/lib/db'
import type { TransferTicket, Attendance } from '@/lib/models'

// 手動で振替チケットを付与
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { memberId, classDateId, expiresAt } = body

    if (!memberId || !classDateId) {
      return NextResponse.json(
        { success: false, error: '会員IDと開催日IDは必須です' },
        { status: 400 }
      )
    }

    const classDatesCollection = await getClassDatesCollection()
    const classDate = await classDatesCollection.findOne({ id: classDateId })

    if (!classDate) {
      return NextResponse.json(
        { success: false, error: '開催日が見つかりません' },
        { status: 404 }
      )
    }

    const ticketsCollection = await getTransferTicketsCollection()

    // 有効期限の設定
    let expiryDate = expiresAt ? new Date(expiresAt) : new Date()
    if (!expiresAt) {
      expiryDate.setMonth(expiryDate.getMonth() + 1)
      expiryDate.setDate(0)
      expiryDate.setHours(23, 59, 59, 999)
    }

    const ticket: TransferTicket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      member_id: memberId,
      class_date_id: classDateId,
      issued_at: new Date(),
      expires_at: expiryDate,
      status: 'unused',
      created_at: new Date(),
      updated_at: new Date(),
    }

    await ticketsCollection.insertOne(ticket)

    return NextResponse.json({
      success: true,
      ticket,
      message: '振替チケットを発行しました',
    })
  } catch (error) {
    console.error('Manual transfer ticket error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
