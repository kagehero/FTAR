'use client'

import { usePathname, useRouter } from 'next/navigation'
import styles from './MemberHeader.module.css'

interface MemberHeaderProps {
  user: { name?: string; email?: string } | null
  onLogout: () => Promise<void> | void
}

const TABS = [
  { label: 'ホーム', href: '/member/home', match: (p: string) => p.startsWith('/member/home') },
  {
    label: '振替チケット',
    href: '/member/transfer-tickets',
    match: (p: string) =>
      p.startsWith('/member/transfer-tickets') || p.startsWith('/member/transfer/select'),
  },
  { label: 'キャンセル待ち', href: '/member/waitlist', match: (p: string) => p.startsWith('/member/waitlist') },
  { label: 'マイページ', href: '/member/mypage', match: (p: string) => p.startsWith('/member/mypage') },
]

export default function MemberHeader({ user, onLogout }: MemberHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()

  const getInitial = () => {
    const src = user?.name || user?.email || '?'
    return src.charAt(0).toUpperCase()
  }

  const handleLogoutClick = async () => {
    await onLogout()
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.headerLeft}>
          <h1 className={styles.logo}>FTAR</h1>
          <nav className={styles.navTabs}>
            {TABS.map((tab) => {
              const isActive = tab.match(pathname)
              return (
                <button
                  key={tab.href}
                  type="button"
                  className={`${styles.tabButton} ${isActive ? styles.tabActive : ''}`}
                  onClick={() => router.push(tab.href)}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
        {user && (
          <div className={styles.userMenuWrapper}>
            <details className={styles.userMenuDetails}>
              <summary className={styles.avatarButton}>{getInitial()}</summary>
              <div className={styles.userMenu}>
                <button
                  type="button"
                  className={styles.userMenuItem}
                  onClick={() => router.push('/member/mypage')}
                >
                  プロフィール
                </button>
                <button
                  type="button"
                  className={styles.userMenuItem}
                  onClick={handleLogoutClick}
                >
                  ログアウト
                </button>
              </div>
            </details>
          </div>
        )}
      </div>
    </header>
  )
}

