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

export default function AdminClassesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<ClassItem>>({
    name: '',
    day_of_week: 1,
    start_time: '16:00',
    end_time: '17:00',
    grade: '',
    category: '',
    capacity: 20,
    venue: '',
    allow_transfer: true,
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
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleEdit = (cls: ClassItem) => {
    setEditingId(cls.id)
    setForm(cls)
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
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const body = {
        ...form,
        capacity: Number(form.capacity) || 0,
      }
      const res = await fetch(
        editingId ? `/api/admin/classes/${editingId}` : '/api/admin/classes',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      const data = await res.json()
      if (!data.success) {
        setError(data.error || '保存に失敗しました')
        setSaving(false)
        return
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
    if (!confirm('このクラスを非アクティブにしますか？')) return
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
              <label className={styles.label}>曜日</label>
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
              <label className={styles.label}>対象学年</label>
              <input
                className={styles.input}
                value={form.grade || ''}
                onChange={(e) => handleChange('grade', e.target.value)}
                placeholder="例: 小学1〜3年"
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>カテゴリ</label>
              <input
                className={styles.input}
                value={form.category || ''}
                onChange={(e) => handleChange('category', e.target.value)}
                placeholder="例: 初心者, 上級"
              />
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
                        className={styles.linkButtonDanger}
                        onClick={() => handleDelete(cls.id)}
                      >
                        無効化
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

