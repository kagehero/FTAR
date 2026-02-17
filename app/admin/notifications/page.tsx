'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { getCurrentUser } from '@/lib/auth-client'
import LoadingScreen from '@/components/LoadingScreen'
import styles from './page.module.css'

interface ClassDate {
  id: string
  date: string
  class: {
    id: string
    name: string
  }
}

interface NotificationLog {
  id: string
  member_id: string
  type: 'email' | 'line'
  subject?: string
  content: string
  sent_at: string
  status: 'sent' | 'failed'
}

export default function NotificationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [classDates, setClassDates] = useState<ClassDate[]>([])
  const [loading, setLoading] = useState(true)
  const [showSendModal, setShowSendModal] = useState(false)
  const [target, setTarget] = useState<'all' | 'class' | 'absent'>('all')
  const [selectedClassDateId, setSelectedClassDateId] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [notificationType, setNotificationType] = useState<'email' | 'line'>('email')
  const [history, setHistory] = useState<NotificationLog[]>([])

  const fetchData = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'admin') {
      router.push('/')
      return
    }
    setUser(currentUser)

    try {
      const [datesRes, historyRes] = await Promise.all([
        fetch('/api/admin/class-dates?startDate=2024-01-01'),
        fetch('/api/admin/notifications/history'),
      ])

      if (datesRes.ok) {
        const datesData = await datesRes.json()
        if (datesData.success) {
          setClassDates(datesData.classDates)
        }
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json()
        if (historyData.success) {
          setHistory(historyData.logs)
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

  const handleSend = async () => {
    if (!subject || !content) {
      toast.error('件名と本文を入力してください')
      return
    }

    if ((target === 'class' || target === 'absent') && !selectedClassDateId) {
      toast.error('クラスを選択してください')
      return
    }

    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          classDateId: selectedClassDateId || undefined,
          subject,
          content,
          type: notificationType,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`${data.count}件の通知を送信しました`)
        setShowSendModal(false)
        setSubject('')
        setContent('')
        await fetchData()
      } else {
        toast.error(data.error || '送信に失敗しました')
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
          <h1 className={styles.title}>メール配信</h1>
          <button
            className={styles.sendButton}
            onClick={() => setShowSendModal(true)}
          >
            📧 新規送信
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>送信履歴</h2>
          <div className={styles.historyList}>
            {history.map((log) => (
              <div key={log.id} className={styles.historyItem}>
                <div className={styles.historyInfo}>
                  <span className={styles.historyDate}>
                    {new Date(log.sent_at).toLocaleString('ja-JP')}
                  </span>
                  <span className={styles.historySubject}>
                    {log.type === 'email' ? '📧' : '💬'} {log.subject || log.content}
                  </span>
                </div>
                <span
                  className={
                    log.status === 'sent' ? styles.statusSent : styles.statusFailed
                  }
                >
                  {log.status === 'sent' ? '送信済み' : '送信失敗'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 送信モーダル */}
        {showSendModal && (
          <div
            className={styles.modalOverlay}
            onClick={() => setShowSendModal(false)}
          >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2>通知送信</h2>
              <div className={styles.formGroup}>
                <label>送信先</label>
                <select value={target} onChange={(e) => setTarget(e.target.value as any)}>
                  <option value="all">全会員</option>
                  <option value="class">特定クラスの出席者</option>
                  <option value="absent">特定クラスの欠席者</option>
                </select>
              </div>
              {(target === 'class' || target === 'absent') && (
                <div className={styles.formGroup}>
                  <label>クラス</label>
                  <select
                    value={selectedClassDateId}
                    onChange={(e) => setSelectedClassDateId(e.target.value)}
                  >
                    <option value="">選択してください</option>
                    {classDates.map((cd) => (
                      <option key={cd.id} value={cd.id}>
                        {cd.class.name} -{' '}
                        {new Date(cd.date).toLocaleDateString('ja-JP')}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.formGroup}>
                <label>通知タイプ</label>
                <select
                  value={notificationType}
                  onChange={(e) => setNotificationType(e.target.value as any)}
                >
                  <option value="email">メール</option>
                  <option value="line">LINE</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>件名</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="件名を入力"
                />
              </div>
              <div className={styles.formGroup}>
                <label>本文</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  placeholder="本文を入力"
                />
              </div>
              <div className={styles.modalActions}>
                <button onClick={handleSend}>送信</button>
                <button onClick={() => setShowSendModal(false)}>キャンセル</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
