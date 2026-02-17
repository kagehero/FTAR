'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout } from '@/lib/auth-client'
import LoadingScreen from '@/components/LoadingScreen'
import styles from './page.module.css'

interface TodayClass {
  classDate: {
    id: string
    date: string
  }
  class: {
    id: string
    name: string
    start_time: string
    end_time: string
    venue: string
  }
  attendance: {
    status: 'unregistered' | 'attending' | 'absent'
  } | null
}

interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
}

export default function MemberHomePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([])
  const [ticketCount, setTicketCount] = useState(0)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
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
        // 本日のクラスを取得
        const classesRes = await fetch('/api/member/today-classes')
        if (classesRes.ok) {
          const classesData = await classesRes.json()
          if (classesData.success) {
            setTodayClasses(classesData.classes)
          }
        }

        // 振替チケット残数を取得
        const ticketsRes = await fetch('/api/member/transfer-tickets/count')
        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json()
          if (ticketsData.success) {
            setTicketCount(ticketsData.count)
          }
        }

        // お知らせを取得
        const announcementsRes = await fetch('/api/member/announcements')
        if (announcementsRes.ok) {
          const announcementsData = await announcementsRes.json()
          if (announcementsData.success) {
            setAnnouncements(announcementsData.announcements)
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

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const getStatusLabel = (status: string | null) => {
    if (!status) return '未登録'
    switch (status) {
      case 'attending':
        return '出席'
      case 'absent':
        return '欠席'
      default:
        return '未登録'
    }
  }

  const getStatusClass = (status: string | null) => {
    if (!status) return styles.statusUnregistered
    switch (status) {
      case 'attending':
        return styles.statusAttending
      case 'absent':
        return styles.statusAbsent
      default:
        return styles.statusUnregistered
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  const hasUnregistered = todayClasses.some(
    (item) => !item.attendance || item.attendance.status === 'unregistered'
  )

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
        <div className={styles.welcomeBox}>
          <h2 className={styles.welcomeTitle}>ようこそ、{user?.name}さん</h2>
          <p className={styles.welcomeText}>
            本日の予定とお知らせを確認できます
          </p>
        </div>

        {/* 振替チケット残数 */}
        <div className={styles.ticketBox}>
          <div className={styles.ticketIcon}>🎫</div>
          <div className={styles.ticketContent}>
            <h3 className={styles.ticketTitle}>振替チケット残数</h3>
            <p className={styles.ticketCount}>{ticketCount}枚</p>
          </div>
        </div>

        {/* 本日の予定 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            本日の予定
            {hasUnregistered && (
              <span className={styles.badge}>出欠未登録あり</span>
            )}
          </h2>

          {todayClasses.length === 0 ? (
            <div className={styles.emptyMessage}>本日の予定はありません</div>
          ) : (
            <div className={styles.classesList}>
              {todayClasses.map((item) => {
                const status = item.attendance?.status || 'unregistered'
                const isUnregistered = !item.attendance || status === 'unregistered'

                return (
                  <div
                    key={item.classDate.id}
                    className={`${styles.classCard} ${isUnregistered ? styles.unregistered : ''}`}
                  >
                    <div className={styles.classHeader}>
                      <h3 className={styles.className}>{item.class.name}</h3>
                      <span className={`${styles.statusBadge} ${getStatusClass(status)}`}>
                        {getStatusLabel(status)}
                      </span>
                    </div>
                    <div className={styles.classInfo}>
                      <p className={styles.classTime}>
                        ⏰ {item.class.start_time} - {item.class.end_time}
                      </p>
                      <p className={styles.classVenue}>📍 {item.class.venue}</p>
                    </div>
                    {isUnregistered && (
                      <button
                        className={styles.quickActionButton}
                        onClick={() => router.push(`/member/attendance/${item.classDate.id}`)}
                      >
                        出欠を登録
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* お知らせ */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>お知らせ</h2>
          {announcements.length === 0 ? (
            <div className={styles.emptyMessage}>お知らせはありません</div>
          ) : (
            <div className={styles.announcementsList}>
              {announcements.map((announcement) => (
                <div key={announcement.id} className={styles.announcementCard}>
                  <h3 className={styles.announcementTitle}>{announcement.title}</h3>
                  <p className={styles.announcementContent}>{announcement.content}</p>
                  <p className={styles.announcementDate}>
                    {new Date(announcement.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
