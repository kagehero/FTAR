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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'email' | 'line'>('all')
  const [deleteTarget, setDeleteTarget] = useState<NotificationLog | null>(null)

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

  const filteredHistory = history.filter((log) => {
    if (statusFilter !== 'all' && log.status !== statusFilter) return false
    if (typeFilter !== 'all' && log.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const subjectText = (log.subject || '').toLowerCase()
      const contentText = (log.content || '').toLowerCase()
      if (!subjectText.includes(q) && !contentText.includes(q)) return false
    }
    return true
  })

  const totalCount = filteredHistory.length
  const sentCount = filteredHistory.filter((l) => l.status === 'sent').length
  const failedCount = filteredHistory.filter((l) => l.status === 'failed').length
  const emailCount = filteredHistory.filter((l) => l.type === 'email').length
  const lineCount = filteredHistory.filter((l) => l.type === 'line').length

  const handleDeleteLog = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/admin/notifications/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        toast.success('通知ログを削除しました')
        setDeleteTarget(null)
        setHistory((prev) => prev.filter((log) => log.id !== deleteTarget.id))
      } else {
        toast.error(data.error || '削除に失敗しました')
      }
    } catch (error) {
      toast.error('エラーが発生しました')
    }
  }

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
          <div className={styles.historyControls}>
            <input
              type="text"
              placeholder="件名・本文で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={styles.filterSelect}
            >
              <option value="all">すべてのステータス</option>
              <option value="sent">送信済み</option>
              <option value="failed">送信失敗</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className={styles.filterSelect}
            >
              <option value="all">すべての種類</option>
              <option value="email">メール</option>
              <option value="line">LINE</option>
            </select>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>件数（表示中）</div>
              <div className={styles.statValue}>{totalCount}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>送信済み</div>
              <div className={styles.statValue}>{sentCount}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>送信失敗</div>
              <div className={styles.statValue}>{failedCount}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>メール / LINE</div>
              <div className={styles.statValue}>
                {emailCount} / {lineCount}
              </div>
            </div>
          </div>

          <div className={styles.historyList}>
            {filteredHistory.map((log) => (
              <div key={log.id} className={styles.historyItem}>
                <div className={styles.historyInfo}>
                  <span className={styles.historyDate}>
                    {new Date(log.sent_at).toLocaleString('ja-JP')}
                  </span>
                  <span className={styles.historySubject}>
                    {log.type === 'email' ? '📧' : '💬'} {log.subject || log.content}
                  </span>
                </div>
                <div className={styles.historyActions}>
                  <span
                    className={
                      log.status === 'sent' ? styles.statusSent : styles.statusFailed
                    }
                  >
                    {log.status === 'sent' ? '送信済み' : '送信失敗'}
                  </span>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => setDeleteTarget(log)}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
            {filteredHistory.length === 0 && (
              <div className={styles.emptyHistory}>条件に一致する履歴がありません</div>
            )}
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

        {/* 削除確認モーダル */}
        {deleteTarget && (
          <div
            className={styles.modalOverlay}
            onClick={() => setDeleteTarget(null)}
          >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2>通知ログの削除</h2>
              <p className={styles.modalMessage}>
                以下の通知ログを削除しますか？この操作は取り消せません。
              </p>
              <p className={styles.modalLogPreview}>
                {deleteTarget.type === 'email' ? '📧' : '💬'}{' '}
                {deleteTarget.subject || deleteTarget.content}
                <br />
                <span className={styles.historyDate}>
                  {new Date(deleteTarget.sent_at).toLocaleString('ja-JP')}
                </span>
              </p>
              <div className={styles.modalActions}>
                <button onClick={handleDeleteLog}>削除する</button>
                <button onClick={() => setDeleteTarget(null)}>キャンセル</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
