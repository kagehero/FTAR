import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getCategoriesCollection, getClassesCollection } from '@/lib/db'

// カテゴリ削除（使用中でなければ削除可能）
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const user = token ? await getCurrentUser(token) : null
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const { id } = await context.params
    const categoriesCollection = await getCategoriesCollection()
    const category = await categoriesCollection.findOne({ id })
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'カテゴリが見つかりません' },
        { status: 404 },
      )
    }

    const classesCollection = await getClassesCollection()
    const inUse = await classesCollection.findOne({ category: category.name })
    if (inUse) {
      return NextResponse.json(
        { success: false, error: 'このカテゴリを使用しているクラスがあるため削除できません' },
        { status: 400 },
      )
    }

    await categoriesCollection.deleteOne({ id })
    return NextResponse.json({ success: true, message: 'カテゴリを削除しました' })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 },
    )
  }
}
