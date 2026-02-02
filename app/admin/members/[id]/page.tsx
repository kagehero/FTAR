'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-client'
import styles from './page.module.css'

interface Member {
  id: string
  name: string
  email: string
  grade: string
  phone?: string
  status: string
  is_active: boolean
  created_at: string
}

interface Attendance {
  id: string
  status: string
  registered_at: string
  class?: {
    name: string
  }
  classDate?: {
    date: string
  }
}

interface Transfer {
  id: string
  status: string
  issued_at: string
  expires_at: string
  used_at?: string
  originalClass?: {
    name: string
  }
  usedClass?: {
    name: string
  }
}

export default function MemberDetailPage() {
  const router = useRouter()
  const params = useParams()
  const memberId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
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
        const res = await fetch(`/api/admin/members/${memberId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setMember(data.member)
            setAttendances(data.attendances)
            setTransfers(data.transfers)
            setNotifications(data.notifications)
            setEditName(data.member.name)
            setEditGrade(data.member.grade)
            setEditPhone(data.member.phone || '')
            setEditStatus(data.member.status)
            setEditIsActive(data.member.is_active)
          }
        }
      } catch (error) {
        console.error('Fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [memberId, router])

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
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
        alert('会員情報を更新しました')
        setEditing(false)
        window.location.reload()
      } else {
        alert(data.error || '更新に失敗しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>読み込み中...</div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>会員が見つかりません</div>
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
          <h1 className={styles.title}>会員詳細</h1>
        </div>
      </header>

      <main className={styles.main}>
        {/* 基本情報 */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>基本情報</h2>
            {!editing ? (
              <button
                className={styles.editButton}
                onClick={() => setEditing(true)}
              >
                編集
              </button>
            ) : (
              <div className={styles.editActions}>
                <button className={styles.saveButton} onClick={handleSave}>
                  保存
                </button>
                <button
                  className={styles.cancelButton}
                  onClick={() => {
                    setEditing(false)
                    setEditName(member.name)
                    setEditGrade(member.grade)
                    setEditPhone(member.phone || '')
                    setEditStatus(member.status)
                    setEditIsActive(member.is_active)
                  }}
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>

          {editing ? (
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
                <label>学年</label>
                <select
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                >
                  <option value="年少">年少</option>
                  <option value="年中">年中</option>
                  <option value="年長">年長</option>
                  <option value="小学1年">小学1年</option>
                  <option value="小学2年">小学2年</option>
                  <option value="小学3年">小学3年</option>
                  <option value="小学4年">小学4年</option>
                  <option value="小学5年">小学5年</option>
                  <option value="小学6年">小学6年</option>
                  <option value="中学1年">中学1年</option>
                  <option value="中学2年">中学2年</option>
                  <option value="中学3年">中学3年</option>
                  <option value="高校1年">高校1年</option>
                  <option value="高校2年">高校2年</option>
                  <option value="高校3年">高校3年</option>
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
          ) : (
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>氏名</span>
                <span className={styles.infoValue}>{member.name}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>メール</span>
                <span className={styles.infoValue}>{member.email}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>学年</span>
                <span className={styles.infoValue}>{member.grade}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>電話番号</span>
                <span className={styles.infoValue}>{member.phone || '-'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>状態</span>
                <span className={styles.infoValue}>{member.status}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>登録日</span>
                <span className={styles.infoValue}>
                  {new Date(member.created_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 出席履歴 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>出席履歴</h2>
          <div className={styles.historyList}>
            {attendances.slice(0, 20).map((att) => (
              <div key={att.id} className={styles.historyItem}>
                <div className={styles.historyInfo}>
                  <span className={styles.historyDate}>
                    {att.classDate
                      ? new Date(att.classDate.date).toLocaleDateString('ja-JP')
                      : '-'}
                  </span>
                  <span className={styles.historyClass}>{att.class?.name || '-'}</span>
                </div>
                <span
                  className={
                    att.status === 'attending'
                      ? styles.statusAttending
                      : styles.statusAbsent
                  }
                >
                  {att.status === 'attending' ? '出席' : '欠席'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 振替履歴 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>振替履歴</h2>
          <div className={styles.historyList}>
            {transfers.slice(0, 20).map((transfer) => (
              <div key={transfer.id} className={styles.historyItem}>
                <div className={styles.historyInfo}>
                  <span className={styles.historyDate}>
                    {new Date(transfer.issued_at).toLocaleDateString('ja-JP')}
                  </span>
                  <span className={styles.historyClass}>
                    {transfer.originalClass?.name || '-'} →{' '}
                    {transfer.usedClass?.name || '未使用'}
                  </span>
                </div>
                <span className={styles.statusBadge}>
                  {transfer.status === 'used' ? '使用済み' : '未使用'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 通知履歴 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>通知履歴</h2>
          <div className={styles.historyList}>
            {notifications.map((notif) => (
              <div key={notif.id} className={styles.historyItem}>
                <div className={styles.historyInfo}>
                  <span className={styles.historyDate}>
                    {new Date(notif.sent_at).toLocaleDateString('ja-JP')}
                  </span>
                  <span className={styles.historyClass}>
                    {notif.type === 'email' ? '📧 メール' : '💬 LINE'}: {notif.subject || notif.content}
                  </span>
                </div>
                <span
                  className={
                    notif.status === 'sent' ? styles.statusSent : styles.statusFailed
                  }
                >
                  {notif.status === 'sent' ? '送信済み' : '送信失敗'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
