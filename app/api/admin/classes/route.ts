import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getClassesCollection } from '@/lib/db'
import type { Class } from '@/lib/models'

// クラス一覧取得・作成
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const user = token ? await getCurrentUser(token) : null
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const classesCollection = await getClassesCollection()
    const classes = await classesCollection
      .find({})
      .sort({ day_of_week: 1, start_time: 1 })
      .toArray()

    return NextResponse.json({ success: true, classes })
  } catch (error) {
    console.error('Get classes error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const user = token ? await getCurrentUser(token) : null
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const body = await request.json()
    const { name, day_of_week, start_time, end_time, grade, category, capacity, venue, allow_transfer } =
      body

    if (
      !name ||
      typeof day_of_week !== 'number' ||
      !start_time ||
      !end_time ||
      !grade ||
      !category ||
      !venue
    ) {
      return NextResponse.json(
        { success: false, error: '必須項目を入力してください' },
        { status: 400 },
      )
    }

    const classesCollection = await getClassesCollection()

    const now = new Date()
    const classId = `class_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const newClass: Class = {
      id: classId,
      name,
      day_of_week,
      start_time,
      end_time,
      grade,
      category,
      capacity: Number(capacity) || 0,
      venue,
      allow_transfer: !!allow_transfer,
      is_active: true,
      created_at: now,
      updated_at: now,
    }

    await classesCollection.insertOne(newClass)

    return NextResponse.json({ success: true, class: newClass })
  } catch (error) {
    console.error('Create class error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 },
    )
  }
}

