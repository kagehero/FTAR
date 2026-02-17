'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { getCurrentUser } from '@/lib/auth-client'
import styles from './page.module.css'

const SESSION_STATUS_LABELS: Record<string, string> = {
  scheduled: '予定',
  completed: '開催済',
  cancelled: '雨天中止',
  holiday: '休み',
}

interface ClassDate {
  id: string
  class_id: string
  date: string
  is_cancelled: boolean
  cancelled_reason?: string
  session_status?: string
  note?: string
  auto_transfer_ticket: boolean
  class?: {
    id: string
    name: string
    day_of_week: number
    start_time: string
    end_time: string
  } | null
}

export default function ClassDatesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [classDates, setClassDates] = useState<ClassDate[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [createDate, setCreateDate] = useState('')
  const [createClassId, setCreateClassId] = useState('')
  const [cancelModal, setCancelModal] = useState<{ id: string; isCancelled: boolean } | null>(null)
  const [cancelNote, setCancelNote] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/')
        return
      }
      setUser(currentUser)

      try {
        const [classesRes, datesRes] = await Promise.all([
          fetch('/api/admin/classes'),
          fetch('/api/admin/class-dates'),
        ])

        if (classesRes.ok) {
          const classesData = await classesRes.json()
          if (classesData.success) {
            setClasses(classesData.classes)
          }
        }

        if (datesRes.ok) {
          const datesData = await datesRes.json()
          if (datesData.success) {
            setClassDates(datesData.classDates)
          }
        }
      } catch (error) {
        console.error('Fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleGenerate = async () => {
    if (!selectedClassId || !startDate || !endDate) {
      toast.error('すべての項目を入力してください')
      return
    }

    try {
      const res = await fetch('/api/admin/class-dates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId,
          startDate,
          endDate,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`${data.count}件の開催日を生成しました`)
        setShowGenerateModal(false)
        window.location.reload()
      } else {
        toast.error(data.error || '生成に失敗しました')
      }
    } catch (error) {
      toast.error('エラーが発生しました')
    }
  }

  const handleCreate = async () => {
    if (!createClassId || !createDate) {
      toast.error('すべての項目を入力してください')
      return
    }

    try {
      const res = await fetch('/api/admin/class-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: createClassId,
          date: createDate,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success('開催日を作成しました')
        setShowCreateModal(false)
        window.location.reload()
      } else {
        toast.error(data.error || '作成に失敗しました')
      }
    } catch (error) {
      toast.error('エラーが発生しました')
    }
  }

  const handleCancel = async (classDateId: string, isCancelled: boolean) => {
    if (isCancelled) {
      doCancel(classDateId, false, '')
      return
    }
    setCancelModal({ id: classDateId, isCancelled: false })
    setCancelNote('雨天')
  }

  const doCancel = async (
    classDateId: string,
    isCancelled: boolean,
    note: string
  ) => {
    try {
      const res = await fetch(`/api/admin/class-dates/${classDateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isCancelled,
          sessionStatus: isCancelled ? 'cancelled' : 'scheduled',
          cancelledReason: note || undefined,
          note: note || undefined,
          autoTransferTicket: true,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('更新しました')
        setCancelModal(null)
        setCancelNote('')
        window.location.reload()
      } else {
        toast.error(data.error || '更新に失敗しました')
      }
    } catch (error) {
      toast.error('エラーが発生しました')
    }
  }

  const getDayName = (day: number) => {
    const days = ['日', '月', '火', '水', '木', '金', '土']
    return days[day]
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
          <button onClick={() => router.back()} className={styles.backButton}>
            ← 戻る
          </button>
          <h1 className={styles.title}>開催日管理</h1>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.actions}>
          <button
            className={styles.actionButton}
            onClick={() => setShowGenerateModal(true)}
          >
            📅 自動生成
          </button>
          <button
            className={styles.actionButton}
            onClick={() => setShowCreateModal(true)}
          >
            ➕ 手動作成
          </button>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>クラス名</th>
                <th>開催日</th>
                <th>曜日</th>
                <th>時間</th>
                <th>状態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {classDates.map((cd) => {
                const classInfo =
                  cd.class ??
                  classes.find((cls) => cls.id === cd.class_id) ??
                  null
                return (
                  <tr key={cd.id}>
                    <td>{classInfo ? classInfo.name : '削除済みクラス'}</td>
                    <td>{new Date(cd.date).toLocaleDateString('ja-JP')}</td>
                    <td>
                      {classInfo && typeof classInfo.day_of_week === 'number'
                        ? getDayName(classInfo.day_of_week)
                        : '-'}
                    </td>
                    <td>
                      {classInfo
                        ? `${classInfo.start_time} - ${classInfo.end_time}`
                        : '-'}
                    </td>
                    <td>
                      <span
                        className={
                          (cd.session_status || (cd.is_cancelled ? 'cancelled' : 'scheduled')) ===
                          'cancelled'
                            ? styles.cancelledBadge
                            : styles.activeBadge
                        }
                      >
                        {SESSION_STATUS_LABELS[
                          cd.session_status ||
                            (cd.is_cancelled ? 'cancelled' : 'scheduled')
                        ] || '予定'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.cancelButton}
                        onClick={() => {
                          if (cd.is_cancelled) {
                            doCancel(cd.id, false, '')
                          } else {
                            setCancelModal({ id: cd.id, isCancelled: false })
                            setCancelNote('雨天')
                          }
                        }}
                      >
                        {cd.is_cancelled ? '再開' : '雨天中止'}
                      </button>
                      {classInfo ? (
                        <Link
                          href={`/admin/class/${cd.id}/attendance`}
                          className={styles.attendanceButton}
                        >
                          名簿
                        </Link>
                      ) : (
                        <span
                          className={`${styles.attendanceButton} ${styles.attendanceButtonDisabled}`}
                          title="クラス情報が存在しません"
                        >
                          名簿
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 自動生成モーダル */}
        {showGenerateModal && (
          <div className={styles.modalOverlay} onClick={() => setShowGenerateModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2>開催日自動生成</h2>
              <div className={styles.formGroup}>
                <label>クラス</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  <option value="">選択してください</option>
                  {classes
                    .filter((cls) => cls.is_active !== false)
                    .map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}（{cls.grade}）
                      </option>
                    ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>開始日</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>終了日</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className={styles.modalActions}>
                <button onClick={handleGenerate}>生成</button>
                <button onClick={() => setShowGenerateModal(false)}>キャンセル</button>
              </div>
            </div>
          </div>
        )}

        {/* 雨天中止モーダル */}
        {cancelModal && (
          <div
            className={styles.modalOverlay}
            onClick={() => setCancelModal(null)}
          >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2>雨天中止</h2>
              <p className={styles.modalHint}>
                備考を入力してください（例: 雨天、台風のため）
              </p>
              <div className={styles.formGroup}>
                <label>備考</label>
                <input
                  type="text"
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                  placeholder="雨天"
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  onClick={() =>
                    doCancel(cancelModal.id, true, cancelNote || '雨天')
                  }
                >
                  中止にする
                </button>
                <button onClick={() => setCancelModal(null)}>キャンセル</button>
              </div>
            </div>
          </div>
        )}

        {/* 手動作成モーダル */}
        {showCreateModal && (
          <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2>開催日手動作成</h2>
              <div className={styles.formGroup}>
                <label>クラス</label>
                <select
                  value={createClassId}
                  onChange={(e) => setCreateClassId(e.target.value)}
                >
                  <option value="">選択してください</option>
                  {classes
                    .filter((cls) => cls.is_active !== false)
                    .map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}（{cls.grade}）
                      </option>
                    ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>開催日</label>
                <input
                  type="date"
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                />
              </div>
              <div className={styles.modalActions}>
                <button onClick={handleCreate}>作成</button>
                <button onClick={() => setShowCreateModal(false)}>キャンセル</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
