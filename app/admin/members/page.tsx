'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { getCurrentUser } from '@/lib/auth-client'
import { GRADE_OPTIONS } from '@/lib/constants'
import LoadingScreen from '@/components/LoadingScreen'
import styles from './page.module.css'

interface Member {
  id: string
  name: string
  email: string
  grade: string
  phone?: string
  status: 'active' | 'suspended' | 'withdrawn'
  is_active: boolean
  created_at: string
}

export default function MembersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)
  const [editTarget, setEditTarget] = useState<Member | null>(null)
  const [editName, setEditName] = useState('')
  const [editGrade, setEditGrade] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/')
        return
      }
      setUser(currentUser)

      try {
        const params = new URLSearchParams()
        if (search) params.append('search', search)
        if (gradeFilter) params.append('grade', gradeFilter)
        if (statusFilter) params.append('status', statusFilter)

        const res = await fetch(`/api/admin/members?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setMembers(data.members)
          }
        }
      } catch (error) {
        console.error('Fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, search, gradeFilter, statusFilter])

  const openEditModal = (member: Member) => {
    setEditTarget(member)
    setEditName(member.name)
    setEditGrade(member.grade)
    setEditPhone(member.phone || '')
    setEditStatus(member.status)
    setEditIsActive(member.is_active)
  }

  const handleEditSave = async () => {
    if (!editTarget) return
    try {
      const res = await fetch(`/api/admin/members/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          grade: editGrade,
          phone: editPhone,
          status: editStatus,
          is_active: editIsActive,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('会員情報を更新しました')
        setEditTarget(null)
        const target = editTarget
        setMembers((prev) =>
          prev.map((m) =>
            m.id === target.id
              ? ({ ...m, name: editName, grade: editGrade, phone: editPhone, status: editStatus as 'active' | 'suspended' | 'withdrawn', is_active: editIsActive })
              : m
          )
        )
      } else {
        toast.error(data.error || '更新に失敗しました')
      }
    } catch (error) {
      toast.error('エラーが発生しました')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/admin/members/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        toast.success('会員を削除しました')
        setDeleteTarget(null)
        setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id))
      } else {
        toast.error(data.error || '削除に失敗しました')
      }
    } catch (error) {
      toast.error('エラーが発生しました')
    }
  }

  const getStatusLabel = (status: string, isActive: boolean) => {
    if (!isActive) return '無効'
    switch (status) {
      case 'active':
        return '在籍'
      case 'suspended':
        return '休会'
      case 'withdrawn':
        return '退会'
      default:
        return status
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← 戻る
          </button>
          <h1 className={styles.title}>会員一覧</h1>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.filters}>
          <input
            type="text"
            placeholder="名前・メールで検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">すべての学年</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">すべての状態</option>
            <option value="active">在籍</option>
            <option value="suspended">休会</option>
            <option value="withdrawn">退会</option>
          </select>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>氏名</th>
                <th>メール</th>
                <th>学年</th>
                <th>電話番号</th>
                <th>状態</th>
                <th>登録日</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{member.grade}</td>
                  <td>{member.phone || '-'}</td>
                  <td>
                    <span
                      className={
                        member.is_active && member.status === 'active'
                          ? styles.statusActive
                          : styles.statusInactive
                      }
                    >
                      {getStatusLabel(member.status, member.is_active)}
                    </span>
                  </td>
                  <td>{new Date(member.created_at).toLocaleDateString('ja-JP')}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.detailButton}
                        onClick={() => router.push(`/admin/members/${member.id}`)}
                      >
                        詳細
                      </button>
                      <button
                        className={styles.editButton}
                        onClick={() => openEditModal(member)}
                      >
                        編集
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => setDeleteTarget(member)}
                        title="会員を削除"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {members.length === 0 && (
          <div className={styles.emptyMessage}>会員が見つかりません</div>
        )}

        {/* 編集モーダル */}
        {editTarget && (
          <div
            className={styles.modalOverlay}
            onClick={() => setEditTarget(null)}
          >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.modalTitle}>会員情報を編集</h2>
              <div className={styles.editForm}>
                <div className={styles.formGroup}>
                  <label>氏名</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>対象学年</label>
                  <select
                    value={editGrade}
                    onChange={(e) => setEditGrade(e.target.value)}
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                    {editGrade && !(GRADE_OPTIONS as readonly string[]).includes(editGrade) && (
                      <option value={editGrade}>{editGrade}</option>
                    )}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>電話番号</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>状態</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="active">在籍</option>
                    <option value="suspended">休会</option>
                    <option value="withdrawn">退会</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>
                    <input
                      type="checkbox"
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                    />
                    アクティブ
                  </label>
                </div>
              </div>
              <div className={styles.modalActions}>
                <button
                  className={styles.modalSaveButton}
                  onClick={handleEditSave}
                >
                  保存
                </button>
                <button
                  className={styles.modalCancelButton}
                  onClick={() => setEditTarget(null)}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 削除確認モーダル */}
        {deleteTarget && (
          <div
            className={styles.modalOverlay}
            onClick={() => setDeleteTarget(null)}
          >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <p className={styles.modalMessage}>
                「{deleteTarget.name}」さんを本当に削除しますか？削除後は一覧に表示されなくなります。
              </p>
              <div className={styles.modalActions}>
                <button
                  className={styles.modalConfirmButton}
                  onClick={handleDelete}
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
