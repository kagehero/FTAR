'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import styles from './MemberHeader.module.css'

interface ChildRow {
  id: string
  name: string
  grade: string
}

interface MemberHeaderProps {
  user: { id?: string; name?: string; email?: string } | null
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
  const [children, setChildren] = useState<ChildRow[]>([])
  const [parentId, setParentId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setChildren([])
      setParentId(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (data.success && data.parentId && Array.isArray(data.children)) {
          if (!cancelled) {
            setParentId(data.parentId)
            setChildren(data.children)
          }
        } else {
          setParentId(null)
          setChildren([])
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const getInitial = () => {
    const src = user?.name || user?.email || '?'
    return src.charAt(0).toUpperCase()
  }

  const handleLogoutClick = async () => {
    await onLogout()
  }

  const handleSwitchChild = async (memberId: string) => {
    if (!memberId || memberId === user?.id) return
    try {
      const res = await fetch('/api/auth/switch-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ memberId }),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || '切り替えに失敗しました')
        return
      }
      router.refresh()
      window.location.reload()
    } catch {
      toast.error('通信エラーが発生しました')
    }
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
          <div className={styles.headerRight}>
            {parentId && children.length > 0 && (
              <div className={styles.childSwitch}>
                <label className={styles.childSwitchLabel} htmlFor="member-child-select">
                  お子様
                </label>
                <select
                  id="member-child-select"
                  className={styles.childSelect}
                  value={user.id}
                  onChange={(e) => handleSwitchChild(e.target.value)}
                >
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}（{c.grade}）
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                  <button type="button" className={styles.userMenuItem} onClick={handleLogoutClick}>
                    ログアウト
                  </button>
                </div>
              </details>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
