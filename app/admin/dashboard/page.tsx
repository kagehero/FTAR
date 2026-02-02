'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout } from '@/lib/auth-client'

interface UserProfile {
  id: string
  email: string
  role: 'member' | 'admin'
  is_active: boolean
  is_deleted: boolean
}
import styles from './page.module.css'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/')
        return
      }
      setUser(currentUser)
      setLoading(false)
    }

    fetchUser()
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

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statContent}>
              <h3 className={styles.statTitle}>総会員数</h3>
              <p className={styles.statValue}>1,234</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>✅</div>
            <div className={styles.statContent}>
              <h3 className={styles.statTitle}>アクティブ会員</h3>
              <p className={styles.statValue}>1,089</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>📊</div>
            <div className={styles.statContent}>
              <h3 className={styles.statTitle}>今月の新規登録</h3>
              <p className={styles.statValue}>45</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>⚠️</div>
            <div className={styles.statContent}>
              <h3 className={styles.statTitle}>保留中の申請</h3>
              <p className={styles.statValue}>12</p>
            </div>
          </div>
        </div>

        <div className={styles.contentGrid}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>👤</div>
            <h3 className={styles.cardTitle}>会員管理</h3>
            <p className={styles.cardDescription}>
              会員情報の確認、編集、削除ができます
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>📝</div>
            <h3 className={styles.cardTitle}>コンテンツ管理</h3>
            <p className={styles.cardDescription}>
              サイトのコンテンツを管理できます
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>🔐</div>
            <h3 className={styles.cardTitle}>権限管理</h3>
            <p className={styles.cardDescription}>
              ユーザーの権限を設定・変更できます
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>📈</div>
            <h3 className={styles.cardTitle}>レポート</h3>
            <p className={styles.cardDescription}>
              各種レポートを確認・出力できます
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>⚙️</div>
            <h3 className={styles.cardTitle}>システム設定</h3>
            <p className={styles.cardDescription}>
              システム全体の設定を変更できます
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>📞</div>
            <h3 className={styles.cardTitle}>サポート管理</h3>
            <p className={styles.cardDescription}>
              お問い合わせを管理・対応できます
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
