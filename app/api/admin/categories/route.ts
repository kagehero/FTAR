import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getCategoriesCollection } from '@/lib/db'
import type { Category } from '@/lib/models'

const DEFAULT_CATEGORY_NAMES = ['キッズ', '通常', 'スーパー強化', '特化', '特待', 'その他']

// カテゴリ一覧取得（初回はデフォルトを投入）
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const user = token ? await getCurrentUser(token) : null
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const coll = await getCategoriesCollection()
    let list = await coll.find({}).sort({ sort_order: 1, name: 1 }).toArray()

    if (list.length === 0) {
      const now = new Date()
      const defaults: Category[] = DEFAULT_CATEGORY_NAMES.map((name, i) => ({
        id: `cat_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        sort_order: i,
        created_at: now,
        updated_at: now,
      }))
      await coll.insertMany(defaults)
      list = await coll.find({}).sort({ sort_order: 1, name: 1 }).toArray()
    }

    return NextResponse.json({ success: true, categories: list })
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 },
    )
  }
}

// カテゴリ追加
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const user = token ? await getCurrentUser(token) : null
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'カテゴリ名を入力してください' },
        { status: 400 },
      )
    }

    const coll = await getCategoriesCollection()
    const existing = await coll.findOne({ name })
    if (existing) {
      return NextResponse.json(
        { success: false, error: '同じ名前のカテゴリが既にあります' },
        { status: 400 },
      )
    }

    const count = await coll.countDocuments()
    const category: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      sort_order: count,
      created_at: new Date(),
      updated_at: new Date(),
    }
    await coll.insertOne(category)

    return NextResponse.json({ success: true, category })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 },
    )
  }
}
