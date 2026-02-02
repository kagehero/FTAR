'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-client'
import styles from './page.module.css'

export default function AttendancePage() {
  const router = useRouter()
  const params = useParams()
  const classDateId = params.classDateId as string

  const [user, setUser] = useState<any>(null)
  const [classInfo, setClassInfo] = useState<any>(null)
  const [classDate, setClassDate] = useState<any>(null)
  const [currentStatus, setCurrentStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [canRegister, setCanRegister] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/')
        return
      }
      setUser(currentUser)

      try {
        // 開催日情報を取得
        const res = await fetch(`/api/member/class-date/${classDateId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setClassInfo(data.class)
            setClassDate(data.classDate)
            setCurrentStatus(data.attendance?.status || null)

            // 開始1時間前チェック
            const classDateTime = new Date(data.classDate.date)
            const [hours, minutes] = data.class.start_time.split(':').map(Number)
            classDateTime.setHours(hours, minutes, 0, 0)

            const now = new Date()
            const oneHourBefore = new Date(classDateTime.getTime() - 60 * 60 * 1000)

            setCanRegister(now <= oneHourBefore)
          }
        }
      } catch (error) {
        console.error('Fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [classDateId, router])

  const handleSubmit = async (status: 'attending' | 'absent') => {
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch(`/api/member/attendance/${classDateId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || '登録に失敗しました')
        setSubmitting(false)
        return
      }

      // 成功したらホームに戻る
      router.push('/member/home')
    } catch (error) {
      setError('予期しないエラーが発生しました')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>読み込み中...</div>
      </div>
    )
  }

  if (!classInfo || !classDate) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>クラス情報が見つかりません</div>
      </div>
    )
  }

  const classDateTime = new Date(classDate.date)
  const [hours, minutes] = classInfo.start_time.split(':').map(Number)
  classDateTime.setHours(hours, minutes, 0, 0)

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>出欠登録</h1>

        <div className={styles.classInfo}>
          <h2 className={styles.className}>{classInfo.name}</h2>
          <p className={styles.classDate}>
            {classDateTime.toLocaleDateString('ja-JP', {
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}
          </p>
          <p className={styles.classTime}>
            {classInfo.start_time} - {classInfo.end_time}
          </p>
          <p className={styles.classVenue}>会場: {classInfo.venue}</p>
        </div>

        {!canRegister && (
          <div className={styles.warning}>
            ⚠️ 開始1時間前を過ぎているため、出欠登録はできません。
            <br />
            変更が必要な場合は管理者にお問い合わせください。
          </div>
        )}

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.statusSection}>
          <h3 className={styles.statusTitle}>出欠ステータス</h3>
          {currentStatus && (
            <p className={styles.currentStatus}>
              現在: {currentStatus === 'attending' ? '出席' : '欠席'}
            </p>
          )}

          <div className={styles.buttons}>
            <button
              className={`${styles.statusButton} ${styles.attendingButton}`}
              onClick={() => handleSubmit('attending')}
              disabled={!canRegister || submitting}
            >
              ✓ 出席
            </button>
            <button
              className={`${styles.statusButton} ${styles.absentButton}`}
              onClick={() => handleSubmit('absent')}
              disabled={!canRegister || submitting}
            >
              ✗ 欠席
            </button>
          </div>

          {classInfo.allow_transfer && (
            <p className={styles.note}>
              ※ 欠席を選択すると、振替チケットが発行されます
            </p>
          )}
        </div>

        <button
          className={styles.backButton}
          onClick={() => router.back()}
          disabled={submitting}
        >
          戻る
        </button>
      </div>
    </div>
  )
}
