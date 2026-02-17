import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getClassDatesCollection,
  getClassesCollection,
  getAttendancesCollection,
  getTransferTicketsCollection,
} from '@/lib/db'
import type { ClassDate, Attendance, TransferTicket } from '@/lib/models'

// 開催日一覧取得
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
    const classId = searchParams.get('classId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const classDatesCollection = await getClassDatesCollection()
    const classesCollection = await getClassesCollection()

    const query: any = {}
    if (classId) {
      query.class_id = classId
    }
    if (startDate || endDate) {
      query.date = {}
      if (startDate) {
        query.date.$gte = new Date(startDate)
      }
      if (endDate) {
        query.date.$lte = new Date(endDate)
      }
    }

    const classDates = await classDatesCollection
      .find(query)
      .sort({ date: 1 })
      .toArray()

    const result = await Promise.all(
      classDates.map(async (cd) => {
        const classInfo = await classesCollection.findOne({ id: cd.class_id })
        return {
          ...cd,
          class: classInfo,
        }
      })
    )

    return NextResponse.json({
      success: true,
      classDates: result,
    })
  } catch (error) {
    console.error('Get class dates error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 開催日作成（手動）
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
    const { classId, date, isCancelled, cancelledReason, autoTransferTicket } = body

    if (!classId || !date) {
      return NextResponse.json(
        { success: false, error: 'クラスIDと日付は必須です' },
        { status: 400 }
      )
    }

    const classesCollection = await getClassesCollection()
    const classInfo = await classesCollection.findOne({ id: classId })

    if (!classInfo) {
      return NextResponse.json(
        { success: false, error: 'クラスが見つかりません' },
        { status: 404 }
      )
    }

    const classDatesCollection = await getClassDatesCollection()

    // 既存チェック
    const existing = await classDatesCollection.findOne({
      class_id: classId,
      date: new Date(date),
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'この日付の開催日は既に存在します' },
        { status: 400 }
      )
    }

    const classDate: ClassDate = {
      id: `classdate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      class_id: classId,
      date: new Date(date),
      is_cancelled: isCancelled || false,
      cancelled_reason: cancelledReason || undefined,
      auto_transfer_ticket: autoTransferTicket || false,
      session_status: isCancelled ? 'cancelled' : 'scheduled',
      note: cancelledReason || undefined,
      created_at: new Date(),
      updated_at: new Date(),
    }

    await classDatesCollection.insertOne(classDate)

    return NextResponse.json({
      success: true,
      classDate,
    })
  } catch (error) {
    console.error('Create class date error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
