'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { getCurrentUser } from '@/lib/auth-client'
import LoadingScreen from '@/components/LoadingScreen'
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
  enrolled_class_ids?: string[]
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
  const [classes, setClasses] = useState<{ id: string; name: string; day_of_week: number; start_time: string; grade: string }[]>([])
  const [enrolledClassIds, setEnrolledClassIds] = useState<string[]>([])
  const [classSaving, setClassSaving] = useState(false)
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'admin') {
      router.push('/')
      return
    }
    setUser(currentUser)

    try {
      const [res, classesRes] = await Promise.all([
        fetch(`/api/admin/members/${memberId}`),
        fetch('/api/admin/classes'),
      ])

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setMember(data.member)
          setEnrolledClassIds(Array.isArray(data.member?.enrolled_class_ids) ? data.member.enrolled_class_ids : [])
          setAttendances(data.attendances)
          setTransfers(data.transfers)
          setNotifications(data.notifications)
        }
      }

      if (classesRes.ok) {
        const classesData = await classesRes.json()
        if (classesData.success) {
          setClasses(classesData.classes || [])
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
  }, [memberId, router])

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

  if (!member) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>会員が見つかりません</div>
      </div>
    )
  }

  const dayLabels = ['日', '月', '火', '水', '木', '金', '土']
  const toggleEnrollClass = (classId: string) => {
    setEnrolledClassIds((prev) => (prev.includes(classId) ? prev.filter((x) => x !== classId) : [...prev, classId]))
  }

  const saveEnrolledClasses = async () => {
    setClassSaving(true)
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrolled_class_ids: enrolledClassIds }),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || '保存に失敗しました')
        return
      }
      toast.success('参加クラスを保存しました')
      setMember((prev) => (prev ? { ...prev, enrolled_class_ids: enrolledClassIds } : prev))
    } catch (e) {
      toast.error('エラーが発生しました')
    } finally {
      setClassSaving(false)
    }
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
          <h2 className={styles.sectionTitle}>基本情報</h2>
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
              <span className={styles.infoValue}>
                {getStatusLabel(member.status, member.is_active)}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>登録日</span>
              <span className={styles.infoValue}>
                {new Date(member.created_at).toLocaleDateString('ja-JP')}
              </span>
            </div>
          </div>
        </div>

        {/* 参加クラス */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>参加クラス</h2>
          <p className={styles.sectionHint}>
            ここで設定したクラスが、管理側の「出欠名簿（未登録）」に表示される対象になります。
            出欠は自動で「出席」にはならず、当日チェックして記録します。
          </p>
          {classes.length === 0 ? (
            <div className={styles.emptyMessage}>クラスが登録されていません</div>
          ) : (
            <div className={styles.historyList}>
              {classes.map((cls) => (
                <label key={cls.id} className={styles.historyItem} style={{ cursor: 'pointer' }}>
                  <div className={styles.historyInfo}>
                    <span className={styles.historyDate}>
                      {dayLabels[cls.day_of_week] ?? '-'} {cls.start_time}
                    </span>
                    <span className={styles.historyClass}>{cls.name}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enrolledClassIds.includes(cls.id)}
                    onChange={() => toggleEnrollClass(cls.id)}
                  />
                </label>
              ))}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <button className={styles.backButton} onClick={saveEnrolledClasses} disabled={classSaving}>
              {classSaving ? '保存中...' : '参加クラスを保存'}
            </button>
          </div>
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
