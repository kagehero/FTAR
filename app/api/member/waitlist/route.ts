import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getWaitlistsCollection,
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

    const waitlistsCollection = await getWaitlistsCollection()
    const classDatesCollection = await getClassDatesCollection()
    const classesCollection = await getClassesCollection()

    const entries = await waitlistsCollection
      .find({ member_id: user.id })
      .sort({ created_at: -1 })
      .toArray()

    const detailed = await Promise.all(
      entries.map(async (entry) => {
        const classDate = await classDatesCollection.findOne({ id: entry.class_date_id })
        if (!classDate) return null

        const cls = await classesCollection.findOne({ id: classDate.class_id })
        if (!cls) return null

        return {
          ...entry,
          classDate,
          class: cls,
        }
      })
    )

    const valid = detailed.filter((e) => e !== null)

    return NextResponse.json({
      success: true,
      waitlist: valid,
    })
  } catch (error) {
    console.error('Get waitlist error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

