'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout } from '@/lib/auth-client'
import styles from './page.module.css'

export default function MyPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/')
        return
      }
      setUser(currentUser)

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
          <h1 className={styles.logo}>FTAR</h1>
          <button onClick={handleLogout} className={styles.logoutButton}>
            ログアウト
          </button>
        </div>
      </header>

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

