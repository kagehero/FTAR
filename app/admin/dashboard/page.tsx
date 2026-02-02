'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout } from '@/lib/auth-client'
import styles from './page.module.css'

interface UserProfile {
  id: string
  email: string
  role: 'member' | 'admin'
  is_active: boolean
  is_deleted: boolean
}

interface TodayClass {
  classDate: { id: string; date: string }
  class: { name: string; start_time: string; end_time: string; venue: string }
  attending: number
  absent: number
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/')
        return
      }
      setUser(currentUser)

      try {
        const res = await fetch('/api/admin/dashboard/today')
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setTodayClasses(data.todayClasses || [])
          }
        }
      } catch (e) {
        console.error('Fetch admin dashboard error:', e)
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
          <h1 className={styles.logo}>FTAR 管理ダッシュボード</h1>
          <button onClick={handleLogout} className={styles.logoutButton}>
            ログアウト
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.welcomeBox}>
          <h2 className={styles.welcomeTitle}>管理者ダッシュボード</h2>
          <p className={styles.welcomeText}>
            ようこそ、{user?.email}さん（管理者）
          </p>
        </div>

        {/* 管理機能メニュー */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>管理機能</h2>
          <div className={styles.menuGrid}>
            <div className={styles.menuCard} onClick={() => router.push('/admin/classes')}>
              <div className={styles.menuIcon}>📚</div>
              <h3 className={styles.menuTitle}>クラス管理</h3>
              <p className={styles.menuDescription}>クラスの追加・編集・削除</p>
            </div>
            <div className={styles.menuCard} onClick={() => router.push('/admin/class-dates')}>
              <div className={styles.menuIcon}>📅</div>
              <h3 className={styles.menuTitle}>開催日管理</h3>
              <p className={styles.menuDescription}>開催日の自動生成・中止処理</p>
            </div>
            <div className={styles.menuCard} onClick={() => router.push('/admin/members')}>
              <div className={styles.menuIcon}>👥</div>
              <h3 className={styles.menuTitle}>会員管理</h3>
              <p className={styles.menuDescription}>会員一覧・詳細・編集</p>
            </div>
            <div className={styles.menuCard} onClick={() => router.push('/admin/transfers')}>
              <div className={styles.menuIcon}>🔄</div>
              <h3 className={styles.menuTitle}>振替管理</h3>
              <p className={styles.menuDescription}>振替履歴・手動発行</p>
            </div>
            <div className={styles.menuCard} onClick={() => router.push('/admin/notifications')}>
              <div className={styles.menuIcon}>📧</div>
              <h3 className={styles.menuTitle}>メール配信</h3>
              <p className={styles.menuDescription}>通知送信・履歴確認</p>
            </div>
          </div>
        </div>

        {/* 本日のクラス一覧 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>本日のクラス一覧</h2>
          {todayClasses.length === 0 ? (
            <div className={styles.emptyMessage}>本日のクラスはありません</div>
          ) : (
            <div className={styles.classesList}>
              {todayClasses.map((item) => {
                const dateObj = new Date(item.classDate.date)
                return (
                  <div key={item.classDate.id} className={styles.classCard}>
                    <div className={styles.classHeader}>
                      <h3 className={styles.className}>{item.class.name}</h3>
                      <span className={styles.classDate}>
                        {dateObj.toLocaleDateString('ja-JP', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        })}
                      </span>
                    </div>
                    <p className={styles.classTime}>
                      {item.class.start_time} - {item.class.end_time} ／ 会場:{' '}
                      {item.class.venue}
                    </p>
                    <p className={styles.classStats}>
                      出席予定: {item.attending}名 ／ 欠席: {item.absent}名
                    </p>
                    <button
                      className={styles.quickButton}
                      onClick={() =>
                        router.push(`/admin/class/${item.classDate.id}/attendance`)
                      }
                    >
                      出欠名簿を表示
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
