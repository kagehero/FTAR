import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getClassDatesCollection,
  getClassesCollection,
  getAttendancesCollection,
} from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { classDateId: string } }
) {
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

    const classDateId = params.classDateId

    const classDatesCollection = await getClassDatesCollection()
    const classDate = await classDatesCollection.findOne({ id: classDateId })

    if (!classDate) {
      return NextResponse.json(
        { success: false, error: '開催日が見つかりません' },
        { status: 404 }
      )
    }

    const classesCollection = await getClassesCollection()
    const classInfo = await classesCollection.findOne({ id: classDate.class_id })

    if (!classInfo) {
      return NextResponse.json(
        { success: false, error: 'クラス情報が見つかりません' },
        { status: 404 }
      )
    }

    const attendancesCollection = await getAttendancesCollection()
    const attendance = await attendancesCollection.findOne({
      member_id: user.id,
      class_date_id: classDateId,
    })

    return NextResponse.json({
      success: true,
      class: classInfo,
      classDate,
      attendance: attendance || null,
    })
  } catch (error) {
    console.error('Get class date error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
