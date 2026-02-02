import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getAttendancesCollection,
  getClassDatesCollection,
  getClassesCollection,
} from '@/lib/db'

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
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 401 }
      )
    }

    const attendancesCollection = await getAttendancesCollection()
    const classDatesCollection = await getClassDatesCollection()
    const classesCollection = await getClassesCollection()

    const attendances = await attendancesCollection
      .find({ member_id: user.id })
      .sort({ created_at: -1 })
      .limit(100)
      .toArray()

    const detailed = await Promise.all(
      attendances.map(async (att) => {
        const classDate = await classDatesCollection.findOne({ id: att.class_date_id })
        if (!classDate) return null
        const cls = await classesCollection.findOne({ id: classDate.class_id })
        if (!cls) return null
        return {
          ...att,
          classDate,
          class: cls,
        }
      })
    )

    const valid = detailed.filter((a) => a !== null)

    return NextResponse.json({
      success: true,
      attendance: valid,
    })
  } catch (error) {
    console.error('Get attendance history error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

