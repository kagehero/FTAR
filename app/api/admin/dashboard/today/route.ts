import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getClassesCollection,
  getClassDatesCollection,
  getAttendancesCollection,
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
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const classesCollection = await getClassesCollection()
    const classDatesCollection = await getClassDatesCollection()
    const attendancesCollection = await getAttendancesCollection()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayClassDates = await classDatesCollection
      .find({
        date: { $gte: today, $lt: tomorrow },
      })
      .toArray()

    let totalMembers = 0
    let totalActive = 0
    let totalNewThisMonth = 0

    // TODO: メンバー数集計は別途実装（getMembersCollection）で可能

    const classes = await Promise.all(
      todayClassDates.map(async (cd) => {
        const cls = await classesCollection.findOne({ id: cd.class_id })
        if (!cls) return null

        const attending = await attendancesCollection.countDocuments({
          class_date_id: cd.id,
          status: 'attending',
        })

        const absent = await attendancesCollection.countDocuments({
          class_date_id: cd.id,
          status: 'absent',
        })

        return {
          classDate: cd,
          class: cls,
          attending,
          absent,
        }
      })
    )

    const validClasses = classes.filter((c) => c !== null)

    return NextResponse.json({
      success: true,
      stats: {
        totalMembers,
        totalActiveMembers: totalActive,
        newMembersThisMonth: totalNewThisMonth,
      },
      todayClasses: validClasses,
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

