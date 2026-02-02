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

export default function MemberHomePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
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
          <h1 className={styles.logo}>FTAR</h1>
          <button onClick={handleLogout} className={styles.logoutButton}>
            ログアウト
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.welcomeBox}>
          <h2 className={styles.welcomeTitle}>ようこそ、{user?.email}さん</h2>
          <p className={styles.welcomeText}>
            会員ホームページへようこそ。こちらから各種サービスをご利用いただけます。
          </p>
        </div>

        <div className={styles.contentGrid}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>📋</div>
            <h3 className={styles.cardTitle}>マイページ</h3>
            <p className={styles.cardDescription}>
              あなたのアカウント情報を確認・編集できます
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>📊</div>
            <h3 className={styles.cardTitle}>利用状況</h3>
            <p className={styles.cardDescription}>
              サービスの利用状況を確認できます
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>⚙️</div>
            <h3 className={styles.cardTitle}>設定</h3>
            <p className={styles.cardDescription}>
              アカウント設定を変更できます
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>📞</div>
            <h3 className={styles.cardTitle}>お問い合わせ</h3>
            <p className={styles.cardDescription}>
              サポートへのお問い合わせができます
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
