'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout } from '@/lib/auth-client'
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

// カテゴリ（学年別）とそれに紐づく対象学年の選択肢
const CATEGORY_OPTIONS = ['キッズ', '1年', '2年', '3年', '4年', '5年', '6年', 'その他'] as const

const GRADE_BY_CATEGORY: Record<string, string[]> = {
  キッズ: ['キッズ'],
  '1年': ['1年', '1年スーパー'],
  '2年': ['2年', '2年スーパー'],
  '3年': ['3年', '3年A', '3年S', '特大'],
  '4年': ['4年', '4年A', '4年S', '特大'],
  '5年': ['5年', '5年A', '5年S', '特大'],
  '6年': ['6年', '6年A', '6年S', '特待'],
  その他: [],
}

// grade から category を逆引き（編集時用）
function getCategoryFromGrade(grade: string): string {
  for (const [cat, grades] of Object.entries(GRADE_BY_CATEGORY)) {
    if (grades.includes(grade)) return cat
  }
  return grade ? 'その他' : ''
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
  const [error, setError] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/')
        return
      }
      setUser(currentUser)

      const res = await fetch('/api/admin/classes')
      const data = await res.json()
      if (data.success) {
        setClasses(data.classes)
      } else {
        setError(data.error || 'クラス一覧の取得に失敗しました')
      }
    } catch (e) {
      setError('予期しないエラーが発生しました')
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
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'category') {
        const grades = GRADE_BY_CATEGORY[value as string] ?? []
        next.grade = grades.length > 0 ? grades[0] : ''
      }
      return next
    })
  }

  const handleEdit = (cls: ClassItem) => {
    setEditingId(cls.id)
    const category =
      cls.category && cls.category in GRADE_BY_CATEGORY
        ? cls.category
        : getCategoryFromGrade(cls.grade)
    const grades = GRADE_BY_CATEGORY[category] ?? []
    const grade =
      grades.length > 0 && grades.includes(cls.grade)
        ? cls.grade
        : grades[0] ?? cls.grade
    setForm({
      ...cls,
      category: category || '',
      grade,
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
    setError('')
    setSaving(true)
    try {
      const days = editingId
        ? [form.day_of_week ?? 1]
        : (form.daysOfWeek ?? [form.day_of_week ?? 1]).filter((d) => d >= 0)

      if (days.length === 0) {
        setError('曜日を1つ以上選択してください')
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
          setError(data.error || '保存に失敗しました')
          setSaving(false)
          return
        }
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
          setError(lastError || `一部の登録に失敗しました（${successCount}/${days.length}件成功）`)
          setSaving(false)
          await loadData()
          return
        }
      }
      await loadData()
      resetForm()
    } catch (e) {
      setError('予期しないエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このクラスを削除しますか？（無効化され、一覧から非表示になります）')) return
    try {
      const res = await fetch(`/api/admin/classes/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) {
        alert(data.error || '削除に失敗しました')
        return
      }
      await loadData()
    } catch (e) {
      alert('予期しないエラーが発生しました')
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>読み込み中...</div>
      </div>
    )
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
          {error && <div className={styles.error}>{error}</div>}
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
              <label className={styles.label}>カテゴリ（学年別）</label>
              <select
                className={styles.input}
                value={form.category || ''}
                onChange={(e) => handleChange('category', e.target.value)}
                required
              >
                <option value="">選択してください</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>対象学年</label>
              {!form.category ? (
                <select className={styles.input} disabled>
                  <option>カテゴリを選択してください</option>
                </select>
              ) : form.category === 'その他' ? (
                <input
                  className={styles.input}
                  value={form.grade || ''}
                  onChange={(e) => handleChange('grade', e.target.value)}
                  placeholder="自由入力"
                  required
                />
              ) : (
                <select
                  className={styles.input}
                  value={form.grade || ''}
                  onChange={(e) => handleChange('grade', e.target.value)}
                  required
                >
                  <option value="">選択してください</option>
                  {(GRADE_BY_CATEGORY[form.category] ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
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
                        onClick={() => handleDelete(cls.id)}
                        title="クラスを削除（無効化）"
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
      </main>
    </div>
  )
}

