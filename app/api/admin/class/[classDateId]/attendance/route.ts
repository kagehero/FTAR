import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getClassDatesCollection,
  getClassesCollection,
  getAttendancesCollection,
  getMembersCollection,
  getWaitlistsCollection,
} from '@/lib/db'
import { GRADE_BY_CATEGORY } from '@/lib/constants'
import type { Attendance } from '@/lib/models'

// 出欠名簿取得
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ classDateId: string }> }
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
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '権限がありません' },
        { status: 403 }
      )
    }

    const { classDateId } = await context.params

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
    const membersCollection = await getMembersCollection()
    const waitlistsCollection = await getWaitlistsCollection()

    // 出席者
    const attendances = await attendancesCollection
      .find({ class_date_id: classDateId, status: 'attending' })
      .toArray()

    // 欠席者
    const absences = await attendancesCollection
      .find({ class_date_id: classDateId, status: 'absent' })
      .toArray()

    // 待ち（遅刻予定・振替待ち等）
    const waitings = await attendancesCollection
      .find({ class_date_id: classDateId, status: 'waiting' })
      .toArray()

    // 未登録者（カテゴリに該当する会員で出欠未登録）
    let gradesInCategory = GRADE_BY_CATEGORY[classInfo.category]
    if (!gradesInCategory || gradesInCategory.length === 0) {
      gradesInCategory = [classInfo.grade]
    }
    const allMembers = await membersCollection
      .find({
        role: 'member',
        is_active: true,
        is_deleted: false,
        grade: { $in: gradesInCategory },
      })
      .toArray()

    const waitlistsData = await waitlistsCollection
      .find({ class_date_id: classDateId })
      .toArray()
    const registeredMemberIds = new Set([
      ...attendances.map((a) => a.member_id),
      ...absences.map((a) => a.member_id),
      ...waitings.map((w) => w.member_id),
      ...waitlistsData.map((w) => w.member_id),
    ])

    const unregistered = allMembers.filter((m) => !registeredMemberIds.has(m.id))

    // キャンセル待ち
    const waitlists = await waitlistsCollection
      .find({ class_date_id: classDateId, status: 'waiting' })
      .sort({ position: 1 })
      .toArray()

    // 会員情報を取得
    const getMemberInfo = async (memberId: string) => {
      return await membersCollection.findOne({ id: memberId })
    }

    const attendanceMembers = await Promise.all(
      attendances.map((a) => getMemberInfo(a.member_id))
    )
    const absenceMembers = await Promise.all(
      absences.map((a) => getMemberInfo(a.member_id))
    )
    const waitingMembers = await Promise.all(
      waitings.map((w) => getMemberInfo(w.member_id))
    )
    const waitlistMembers = await Promise.all(
      waitlists.map((w) => getMemberInfo(w.member_id))
    )

    return NextResponse.json({
      success: true,
      classDate,
      class: classInfo,
      attendances: attendanceMembers
        .filter((m) => m !== null)
        .map((m, i) => ({
          member: m,
          attendance: attendances[i],
        })),
      absences: absenceMembers
        .filter((m) => m !== null)
        .map((m, i) => ({
          member: m,
          attendance: absences[i],
        })),
      waitings: waitingMembers
        .filter((m) => m !== null)
        .map((m, i) => ({
          member: m,
          attendance: waitings[i],
        })),
      unregistered: unregistered,
      waitlists: waitlistMembers
        .filter((m) => m !== null)
        .map((m, i) => ({
          member: m,
          waitlist: waitlists[i],
        })),
    })
  } catch (error) {
    console.error('Get attendance list error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 出欠手動変更
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ classDateId: string }> }
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
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '権限がありません' },
        { status: 403 }
      )
    }

    const { classDateId } = await context.params
    const body = await request.json()
    const { memberId, status } = body

    if (!memberId || !status || !['attending', 'absent', 'waiting'].includes(status)) {
      return NextResponse.json(
        { success: false, error: '無効なパラメータです' },
        { status: 400 }
      )
    }

    const attendancesCollection = await getAttendancesCollection()

    const existing = await attendancesCollection.findOne({
      member_id: memberId,
      class_date_id: classDateId,
    })

    const now = new Date()
    const attendanceData: Attendance = {
      id:
        existing?.id ||
        `attendance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      member_id: memberId,
      class_date_id: classDateId,
      status: status as 'attending' | 'absent' | 'waiting',
      registered_at: now,
      changed_by: user.id,
      checkin_time: status === 'attending' ? now : undefined,
      created_at: existing?.created_at || now,
      updated_at: now,
    }

    if (existing) {
      await attendancesCollection.updateOne(
        { id: existing.id },
        { $set: attendanceData }
      )
    } else {
      await attendancesCollection.insertOne(attendanceData)
    }

    return NextResponse.json({
      success: true,
      message: '出欠を更新しました',
    })
  } catch (error) {
    console.error('Update attendance error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
