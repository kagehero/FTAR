import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getClassDatesCollection, getClassesCollection } from '@/lib/db'
import type { ClassDate } from '@/lib/models'

// 定期クラスから開催日を自動生成
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
    const { classId, startDate, endDate } = body

    if (!classId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'クラスID、開始日、終了日は必須です' },
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

    const start = new Date(startDate)
    const end = new Date(endDate)
    const generatedDates: ClassDate[] = []

    // 指定期間内の該当曜日を全て生成
    const currentDate = new Date(start)
    while (currentDate <= end) {
      if (currentDate.getDay() === classInfo.day_of_week) {
        // 既存チェック
        const existing = await classDatesCollection.findOne({
          class_id: classId,
          date: new Date(currentDate),
        })

        if (!existing) {
          const classDate: ClassDate = {
            id: `classdate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            class_id: classId,
            date: new Date(currentDate),
            is_cancelled: false,
            auto_transfer_ticket: false,
            created_at: new Date(),
            updated_at: new Date(),
          }
          generatedDates.push(classDate)
        }
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    if (generatedDates.length > 0) {
      await classDatesCollection.insertMany(generatedDates)
    }

    return NextResponse.json({
      success: true,
      count: generatedDates.length,
      classDates: generatedDates,
    })
  } catch (error) {
    console.error('Generate class dates error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
