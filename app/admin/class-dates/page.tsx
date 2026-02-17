'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { getCurrentUser } from '@/lib/auth-client'
import LoadingScreen from '@/components/LoadingScreen'
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
  const [selectedClassName, setSelectedClassName] = useState('')
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [createStartDate, setCreateStartDate] = useState('')
  const [createEndDate, setCreateEndDate] = useState('')
  const [createClassName, setCreateClassName] = useState('')
  const [createDayOfWeek, setCreateDayOfWeek] = useState<number[]>([])

  const dayLabels = ['日', '月', '火', '水', '木', '金', '土']
  const activeClasses = classes.filter((cls) => cls.is_active !== false)
  const uniqueClassNames = Array.from(new Set(activeClasses.map((c) => c.name))).sort()

  const getClassesByName = (name: string) =>
    activeClasses.filter((c) => c.name === name)

  const resolveClassId = (name: string, day: number | '') => {
    const candidates = getClassesByName(name)
    if (candidates.length === 0) return ''
    if (candidates.length === 1) return candidates[0].id
    if (day === '') return ''
    const found = candidates.find((c) => c.day_of_week === day)
    return found ? found.id : ''
  }

  const resolveClassIds = (name: string, days: number[]) => {
    const candidates = getClassesByName(name)
    if (candidates.length === 0) return []
    if (candidates.length === 1) return [candidates[0].id]
    return days
      .map((d) => candidates.find((c) => c.day_of_week === d)?.id)
      .filter((id): id is string => !!id)
  }

  const toggleCreateDay = (day: number) => {
    const candidates = getClassesByName(createClassName)
    if (candidates.length <= 1) return
    setCreateDayOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }
  const [cancelModal, setCancelModal] = useState<{ id: string; isCancelled: boolean } | null>(null)
  const [cancelNote, setCancelNote] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ClassDate | null>(null)

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

  useEffect(() => {
    fetchData()
  }, [router])

  const handleGenerate = async () => {
    const classId = resolveClassId(selectedClassName, selectedDayOfWeek)
    if (!classId || !startDate || !endDate) {
      toast.error('すべての項目を入力してください')
      return
    }

    try {
      const res = await fetch('/api/admin/class-dates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          startDate,
          endDate,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`${data.count}件の開催日を生成しました`)
        setShowGenerateModal(false)
        setSelectedClassName('')
        setSelectedDayOfWeek('')
        await fetchData()
      } else {
        toast.error(data.error || '生成に失敗しました')
      }
    } catch (error) {
      toast.error('エラーが発生しました')
    }
  }

  const handleCreate = async () => {
    const candidates = getClassesByName(createClassName)
    const classIds =
      candidates.length === 1 ? [candidates[0].id] : resolveClassIds(createClassName, createDayOfWeek)

    if (!createClassName || classIds.length === 0 || !createStartDate || !createEndDate) {
      toast.error('すべての項目を入力してください（曜日を1つ以上選択）')
      return
    }
    if (new Date(createStartDate) > new Date(createEndDate)) {
      toast.error('開始日は終了日より前を指定してください')
      return
    }

    try {
      let totalCount = 0
      let lastError = ''
      for (const classId of classIds) {
        const res = await fetch('/api/admin/class-dates/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId,
            startDate: createStartDate,
            endDate: createEndDate,
          }),
        })
        const data = await res.json()
        if (data.success) totalCount += data.count
        else lastError = data.error || ''
      }
      if (totalCount > 0) {
        toast.success(`${totalCount}件の開催日を作成しました`)
        setShowCreateModal(false)
        setCreateClassName('')
        setCreateDayOfWeek([])
        setCreateStartDate('')
        setCreateEndDate('')
        await fetchData()
      } else {
        toast.error(lastError || '作成に失敗しました')
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
        await fetchData()
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

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/admin/class-dates/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        toast.success('開催日を削除しました')
        setDeleteTarget(null)
        await fetchData()
      } else {
        toast.error(data.error || '削除に失敗しました')
      }
    } catch (error) {
      toast.error('エラーが発生しました')
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
                      <button
                        className={styles.deleteButton}
                        onClick={() => setDeleteTarget(cd)}
                        title="開催日を削除"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 自動生成モーダル */}
        {showGenerateModal && (
          <div
            className={styles.modalOverlay}
            onClick={() => {
              setShowGenerateModal(false)
              setSelectedClassName('')
              setSelectedDayOfWeek('')
            }}
          >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2>開催日自動生成</h2>
              <div className={styles.formGroup}>
                <label>クラス名</label>
                <select
                  value={selectedClassName}
                  onChange={(e) => {
                    setSelectedClassName(e.target.value)
                    setSelectedDayOfWeek('')
                  }}
                >
                  <option value="">選択してください</option>
                  {uniqueClassNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedClassName && getClassesByName(selectedClassName).length > 1 && (
                <div className={styles.formGroup}>
                  <label>曜日</label>
                  <select
                    value={selectedDayOfWeek}
                    onChange={(e) =>
                      setSelectedDayOfWeek(e.target.value === '' ? '' : Number(e.target.value))
                    }
                  >
                    <option value="">選択してください</option>
                    {getClassesByName(selectedClassName)
                      .sort((a, b) => a.day_of_week - b.day_of_week)
                      .map((cls) => (
                        <option key={cls.id} value={cls.day_of_week}>
                          {dayLabels[cls.day_of_week]}曜日
                        </option>
                      ))}
                  </select>
                </div>
              )}
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
                <button
                  onClick={() => {
                    setShowGenerateModal(false)
                    setSelectedClassName('')
                    setSelectedDayOfWeek('')
                  }}
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
                現在選択されている開催日を本当に削除しますか？
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
          <div
            className={styles.modalOverlay}
            onClick={() => {
              setShowCreateModal(false)
              setCreateClassName('')
              setCreateDayOfWeek([])
              setCreateStartDate('')
              setCreateEndDate('')
            }}
          >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2>開催日手動作成</h2>
              <div className={styles.formGroup}>
                <label>クラス名</label>
                <select
                  value={createClassName}
                  onChange={(e) => {
                    setCreateClassName(e.target.value)
                    setCreateDayOfWeek([])
                  }}
                >
                  <option value="">選択してください</option>
                  {uniqueClassNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              {createClassName && getClassesByName(createClassName).length > 1 && (
                <div className={styles.formGroup}>
                  <label>曜日（複数選択可）</label>
                  <div className={styles.dayCheckboxes}>
                    {getClassesByName(createClassName)
                      .sort((a, b) => a.day_of_week - b.day_of_week)
                      .map((cls) => (
                        <label key={cls.id} className={styles.dayCheckbox}>
                          <input
                            type="checkbox"
                            checked={createDayOfWeek.includes(cls.day_of_week)}
                            onChange={() => toggleCreateDay(cls.day_of_week)}
                          />
                          <span>{dayLabels[cls.day_of_week]}曜日</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}
              <div className={styles.formGroup}>
                <label>開始日</label>
                <input
                  type="date"
                  value={createStartDate}
                  onChange={(e) => setCreateStartDate(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>終了日</label>
                <input
                  type="date"
                  value={createEndDate}
                  onChange={(e) => setCreateEndDate(e.target.value)}
                />
              </div>
              <div className={styles.modalActions}>
                <button onClick={handleCreate}>作成</button>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setCreateClassName('')
                    setCreateDayOfWeek([])
                    setCreateStartDate('')
                    setCreateEndDate('')
                  }}
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
