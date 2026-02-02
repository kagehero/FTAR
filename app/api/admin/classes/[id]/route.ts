import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getClassesCollection } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const user = token ? await getCurrentUser(token) : null
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const { id } = await context.params

    const body = await request.json()
    const { name, day_of_week, start_time, end_time, grade, category, capacity, venue, allow_transfer, is_active } =
      body

    const classesCollection = await getClassesCollection()
    const classDoc = await classesCollection.findOne({ id })
    if (!classDoc) {
      return NextResponse.json({ success: false, error: 'クラスが見つかりません' }, { status: 404 })
    }

    await classesCollection.updateOne(
      { id },
      {
        $set: {
          name,
          day_of_week,
          start_time,
          end_time,
          grade,
          category,
          capacity: Number(capacity) || 0,
          venue,
          allow_transfer: !!allow_transfer,
          is_active: !!is_active,
          updated_at: new Date(),
        },
      },
    )

    const updated = await classesCollection.findOne({ id })

    return NextResponse.json({ success: true, class: updated })
  } catch (error) {
    console.error('Update class error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const user = token ? await getCurrentUser(token) : null
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const { id } = await context.params

    const classesCollection = await getClassesCollection()
    const classDoc = await classesCollection.findOne({ id })
    if (!classDoc) {
      return NextResponse.json({ success: false, error: 'クラスが見つかりません' }, { status: 404 })
    }

    await classesCollection.updateOne(
      { id },
      {
        $set: {
          is_active: false,
          updated_at: new Date(),
        },
      },
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete class error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 },
    )
  }
}

