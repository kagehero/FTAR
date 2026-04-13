'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { getCurrentUser, logout } from '@/lib/auth-client'
import { GRADE_OPTIONS } from '@/lib/constants'
import LoadingScreen from '@/components/LoadingScreen'
import MemberHeader from '@/components/MemberHeader'
import styles from './page.module.css'

export default function MyPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [parentId, setParentId] = useState<string | null>(null)
  const [siblingCount, setSiblingCount] = useState(0)
  const [addName, setAddName] = useState('')
  const [addGrade, setAddGrade] = useState('')
  const [addingChild, setAddingChild] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/')
        return
      }
      setUser(currentUser)

      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' })
        if (meRes.ok) {
          const meData = await meRes.json()
          if (meData.success && meData.parentId) {
            setParentId(meData.parentId)
            setSiblingCount(Array.isArray(meData.children) ? meData.children.length : 0)
          }
        }
      } catch {
        /* ignore */
      }

      try {
        const [attendanceRes, ticketsRes] = await Promise.all([
          fetch('/api/member/attendance-history'),
          fetch('/api/member/transfer-history'),
        ])

        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json()
          if (attendanceData.success) {
            setAttendance(attendanceData.attendance)
          }
        }

        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json()
          if (ticketsData.success) {
            setTickets(ticketsData.tickets)
          }
        }
      } catch (e) {
        console.error('Fetch mypage data error:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const handleAddSibling = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addName.trim() || !addGrade) {
      toast.error('氏名と学年を入力してください')
      return
    }
    setAddingChild(true)
    try {
      const res = await fetch('/api/member/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: addName.trim(), grade: addGrade }),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || '登録に失敗しました')
        return
      }
      toast.success('お子様を追加しました。ヘッダーから切り替えられます。')
      setAddName('')
      setAddGrade('')
      setSiblingCount((c) => c + 1)
      router.refresh()
      window.location.reload()
    } catch {
      toast.error('エラーが発生しました')
    } finally {
      setAddingChild(false)
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className={styles.container}>
      <MemberHeader user={user} onLogout={handleLogout} />

      <main className={styles.main}>
        {/* プロフィール */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>プロフィール</h2>
          <div className={styles.profileCard}>
            <p>
              <span className={styles.label}>氏名：</span>
              {user?.name}
            </p>
            <p>
              <span className={styles.label}>学年：</span>
              {user?.grade}
            </p>
            <p>
              <span className={styles.label}>メール：</span>
              {user?.email}
            </p>
          </div>
        </section>

        {parentId && siblingCount < 5 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>ご兄弟のお子様を登録</h2>
            <p className={styles.hint}>
              同じ保護者アカウントで、最大5人まで追加できます。ヘッダーの「お子様」から切り替えて利用します。
            </p>
            <form className={styles.addChildForm} onSubmit={handleAddSibling}>
              <div className={styles.addChildRow}>
                <label>
                  氏名
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="山田 花子"
                    disabled={addingChild}
                  />
                </label>
                <label>
                  学年
                  <select
                    value={addGrade}
                    onChange={(e) => setAddGrade(e.target.value)}
                    disabled={addingChild}
                  >
                    <option value="">選択</option>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className={styles.addChildBtn} disabled={addingChild}>
                  {addingChild ? '登録中...' : '追加する'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* 出席履歴 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>出席履歴</h2>
          {attendance.length === 0 ? (
            <div className={styles.emptyMessage}>出席履歴はありません</div>
          ) : (
            <div className={styles.list}>
              {attendance.slice(0, 20).map((item) => {
                const dateObj = new Date(item.classDate.date)
                const statusLabel =
                  item.status === 'attending'
                    ? '出席'
                    : item.status === 'absent'
                    ? '欠席'
                    : '未登録'
                return (
                  <div key={item.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h3 className={styles.className}>{item.class.name}</h3>
                      <span className={styles.status}>{statusLabel}</span>
                    </div>
                    <p className={styles.date}>
                      {dateObj.toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </p>
                    <p className={styles.time}>
                      {item.class.start_time} - {item.class.end_time}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* 振替履歴 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>振替履歴</h2>
          {tickets.length === 0 ? (
            <div className={styles.emptyMessage}>振替履歴はありません</div>
          ) : (
            <div className={styles.list}>
              {tickets.slice(0, 20).map((ticket) => {
                const issued = new Date(ticket.issued_at)
                const statusLabel =
                  ticket.status === 'unused'
                    ? '未使用'
                    : ticket.status === 'used'
                    ? '使用済み'
                    : '失効'
                return (
                  <div key={ticket.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h3 className={styles.className}>{ticket.class.name}</h3>
                      <span className={styles.status}>{statusLabel}</span>
                    </div>
                    <p className={styles.date}>
                      発行日: {issued.toLocaleDateString('ja-JP')}
                    </p>
                    {ticket.usedClass && (
                      <p className={styles.time}>振替先: {ticket.usedClass.name}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

