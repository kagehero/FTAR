'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { getCurrentUser, logout } from '@/lib/auth-client'
import { GRADE_OPTIONS } from '@/lib/constants'
import LoadingScreen from '@/components/LoadingScreen'
import styles from './page.module.css'

interface ClassItem {
  id: string
  name: string
  day_of_week: number
  start_time: string
  end_time: string
  grade: string
  category: string
  capacity: number
  venue: string
  allow_transfer: boolean
  is_active: boolean
}

const dayLabels = ['日', '月', '火', '水', '木', '金', '土']

interface CategoryItem {
  id: string
  name: string
  sort_order?: number
}

function parseGrades(gradeStr: string): string[] {
  if (!gradeStr) return []
  return gradeStr.split(',').map((s) => s.trim()).filter(Boolean)
}

function joinGrades(grades: string[]): string {
  return grades.filter(Boolean).join(',')
}

export default function AdminClassesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<ClassItem> & { daysOfWeek?: number[] }>({
    name: '',
    day_of_week: 1,
    start_time: '16:00',
    end_time: '17:00',
    grade: '',
    category: '',
    capacity: 20,
    venue: '',
    allow_transfer: true,
    daysOfWeek: [1], // 複数曜日選択（編集時は未使用）
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null)
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/')
        return
      }
      setUser(currentUser)

      const [classesRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/classes'),
        fetch('/api/admin/categories'),
      ])
      const classesData = await classesRes.json()
      const categoriesData = await categoriesRes.json()
      if (classesData.success) {
        setClasses(classesData.classes)
      } else {
        toast.error(classesData.error || 'クラス一覧の取得に失敗しました')
      }
      if (categoriesData.success) {
        setCategories(categoriesData.categories)
      }
    } catch (e) {
      toast.error('予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const handleChange = (field: keyof ClassItem, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleTargetGrade = (g: string) => {
    const current = parseGrades(form.grade || '')
    const next = current.includes(g)
      ? current.filter((x) => x !== g)
      : [...current, g].sort(
          (a, b) => GRADE_OPTIONS.indexOf(a as any) - GRADE_OPTIONS.indexOf(b as any)
        )
    setForm((prev) => ({ ...prev, grade: joinGrades(next) }))
  }

  const handleEdit = (cls: ClassItem) => {
    setEditingId(cls.id)
    const parsedGrades = parseGrades(cls.grade || '').filter((g) =>
      GRADE_OPTIONS.includes(g as any)
    )
    setForm({
      ...cls,
      category: cls.category || '',
      grade: parsedGrades.length > 0 ? joinGrades(parsedGrades) : cls.grade || '',
      daysOfWeek: [cls.day_of_week],
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm({
      name: '',
      day_of_week: 1,
      start_time: '16:00',
      end_time: '17:00',
      grade: '',
      category: '',
      capacity: 20,
      venue: '',
      allow_transfer: true,
      is_active: true,
      daysOfWeek: [1],
    })
  }

  const toggleDay = (day: number) => {
    if (editingId) return
    const current = form.daysOfWeek ?? [1]
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b)
    if (next.length === 0) return
    setForm((prev) => ({
      ...prev,
      daysOfWeek: next,
      day_of_week: next[0],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const days = editingId
        ? [form.day_of_week ?? 1]
        : (form.daysOfWeek ?? [form.day_of_week ?? 1]).filter((d) => d >= 0)

      if (days.length === 0) {
        toast.error('曜日を1つ以上選択してください')
        setSaving(false)
        return
      }

      const gradeStr = form.grade?.trim()
      if (!gradeStr) {
        toast.error('対象学年を1つ以上選択してください')
        setSaving(false)
        return
      }

      if (editingId) {
        const body = {
          ...form,
          day_of_week: form.day_of_week ?? 1,
          capacity: Number(form.capacity) || 0,
        }
        const res = await fetch(`/api/admin/classes/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!data.success) {
          toast.error(data.error || '保存に失敗しました')
          setSaving(false)
          return
        }
        toast.success('クラスを更新しました')
      } else {
        let successCount = 0
        let lastError = ''
        for (const day of days) {
          const body = {
            name: form.name,
            day_of_week: day,
            start_time: form.start_time,
            end_time: form.end_time,
            grade: form.grade,
            category: form.category,
            capacity: Number(form.capacity) || 0,
            venue: form.venue || '未設定',
            allow_transfer: !!form.allow_transfer,
          }
          const res = await fetch('/api/admin/classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          const data = await res.json()
          if (data.success) successCount++
          else lastError = data.error || ''
        }
        if (successCount < days.length) {
          toast.error(lastError || `一部の登録に失敗しました（${successCount}/${days.length}件成功）`)
          setSaving(false)
          await loadData()
          return
        }
        toast.success(`${successCount}件のクラスを追加しました`)
      }
      await loadData()
      resetForm()
    } catch (e) {
      toast.error('予期しないエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/admin/classes/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || '削除に失敗しました')
        return
      }
      toast.success('クラスを削除しました')
      setDeleteTarget(null)
      await loadData()
    } catch (e) {
      toast.error('予期しないエラーが発生しました')
    }
  }

  const handleAddCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) {
      toast.error('カテゴリ名を入力してください')
      return
    }
    setCategorySaving(true)
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || '追加に失敗しました')
        return
      }
      toast.success('カテゴリを追加しました')
      setNewCategoryName('')
      const listRes = await fetch('/api/admin/categories')
      const listData = await listRes.json()
      if (listData.success) setCategories(listData.categories)
    } catch (e) {
      toast.error('予期しないエラーが発生しました')
    } finally {
      setCategorySaving(false)
    }
  }

  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (!confirm(`カテゴリ「${cat.name}」を削除しますか？`)) return
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || '削除に失敗しました')
        return
      }
      toast.success('カテゴリを削除しました')
      setCategories((prev) => prev.filter((c) => c.id !== cat.id))
    } catch (e) {
      toast.error('予期しないエラーが発生しました')
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>クラス管理</h1>
          <button onClick={handleLogout} className={styles.logoutButton}>
            ログアウト
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {editingId ? 'クラス編集' : 'クラス追加'}
          </h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <label className={styles.label}>クラス名</label>
              <input
                className={styles.input}
                value={form.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>
                曜日{!editingId && '（複数選択可・一括登録）'}
              </label>
              {editingId ? (
                <select
                  className={styles.input}
                  value={form.day_of_week ?? 1}
                  onChange={(e) =>
                    handleChange('day_of_week', Number(e.target.value))
                  }
                >
                  {dayLabels.map((label, idx) => (
                    <option key={idx} value={idx}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={styles.dayCheckboxes}>
                  {dayLabels.map((label, idx) => (
                    <label key={idx} className={styles.dayCheckbox}>
                      <input
                        type="checkbox"
                        checked={(form.daysOfWeek ?? [1]).includes(idx)}
                        onChange={() => toggleDay(idx)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.formRowInline}>
              <div>
                <label className={styles.label}>開始時刻</label>
                <input
                  type="time"
                  className={styles.input}
                  value={form.start_time || ''}
                  onChange={(e) => handleChange('start_time', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={styles.label}>終了時刻</label>
                <input
                  type="time"
                  className={styles.input}
                  value={form.end_time || ''}
                  onChange={(e) => handleChange('end_time', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>カテゴリ</label>
              <select
                className={styles.input}
                value={form.category || ''}
                onChange={(e) => handleChange('category', e.target.value)}
                required
              >
                <option value="">選択してください</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>対象学年（複数選択可）</label>
              <div className={styles.gradeCheckboxes}>
                {GRADE_OPTIONS.map((g) => (
                  <label key={g} className={styles.gradeCheckbox}>
                    <input
                      type="checkbox"
                      checked={parseGrades(form.grade || '').includes(g)}
                      onChange={() => toggleTargetGrade(g)}
                    />
                    {g}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.formRowInline}>
              <div>
                <label className={styles.label}>定員</label>
                <input
                  type="number"
                  className={styles.input}
                  value={form.capacity ?? 0}
                  onChange={(e) =>
                    handleChange('capacity', Number(e.target.value))
                  }
                  min={0}
                />
              </div>
              <div>
                <label className={styles.label}>会場</label>
                <input
                  className={styles.input}
                  value={form.venue || ''}
                  onChange={(e) => handleChange('venue', e.target.value)}
                />
              </div>
            </div>
            <div className={styles.formRowCheckbox}>
              <label>
                <input
                  type="checkbox"
                  checked={!!form.allow_transfer}
                  onChange={(e) =>
                    handleChange('allow_transfer', e.target.checked)
                  }
                />
                振替を許可する
              </label>
            </div>
            {editingId && (
              <div className={styles.formRowCheckbox}>
                <label>
                  <input
                    type="checkbox"
                    checked={form.is_active !== false}
                    onChange={(e) =>
                      handleChange('is_active', e.target.checked)
                    }
                  />
                  アクティブ
                </label>
              </div>
            )}
            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={saving}
              >
                {saving ? '保存中...' : editingId ? '更新' : '追加'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={resetForm}
                >
                  キャンセル
                </button>
              )}
            </div>
          </form>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>カテゴリ管理</h2>
          <p className={styles.sectionHint}>
            クラスで使うカテゴリを追加できます。使用中のカテゴリは削除できません。
          </p>
          <div className={styles.categoryAdd}>
            <input
              type="text"
              className={styles.input}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="新しいカテゴリ名"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
            />
            <button
              type="button"
              className={styles.submitButton}
              onClick={handleAddCategory}
              disabled={categorySaving || !newCategoryName.trim()}
            >
              {categorySaving ? '追加中...' : '追加'}
            </button>
          </div>
          <ul className={styles.categoryList}>
            {categories.map((c) => (
              <li key={c.id} className={styles.categoryItem}>
                <span>{c.name}</span>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => handleDeleteCategory(c)}
                  title="カテゴリを削除"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>クラス一覧</h2>
          {classes.length === 0 ? (
            <div className={styles.emptyMessage}>クラスは登録されていません</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>クラス名</th>
                  <th>曜日</th>
                  <th>時間</th>
                  <th>学年</th>
                  <th>カテゴリ</th>
                  <th>定員</th>
                  <th>会場</th>
                  <th>振替</th>
                  <th>状態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => (
                  <tr key={cls.id}>
                    <td>{cls.name}</td>
                    <td>{dayLabels[cls.day_of_week] ?? '-'}</td>
                    <td>
                      {cls.start_time} - {cls.end_time}
                    </td>
                    <td>{cls.grade}</td>
                    <td>{cls.category}</td>
                    <td>{cls.capacity}</td>
                    <td>{cls.venue}</td>
                    <td>{cls.allow_transfer ? '可' : '不可'}</td>
                    <td>{cls.is_active ? '有効' : '無効'}</td>
                    <td>
                      <button
                        className={styles.linkButton}
                        onClick={() => handleEdit(cls)}
                      >
                        編集
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => setDeleteTarget(cls)}
                        title="クラスを削除"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* 削除確認モーダル */}
        {deleteTarget && (
          <div
            className={styles.modalOverlay}
            onClick={() => setDeleteTarget(null)}
          >
            <div
              className={styles.modal}
              onClick={(e) => e.stopPropagation()}
            >
              <p className={styles.modalMessage}>
                現在選択されているクラスを本当に削除しますか？
              </p>
              <div className={styles.modalActions}>
                <button
                  className={styles.modalConfirmButton}
                  onClick={handleDeleteConfirm}
                >
                  削除する
                </button>
                <button
                  className={styles.modalCancelButton}
                  onClick={() => setDeleteTarget(null)}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

