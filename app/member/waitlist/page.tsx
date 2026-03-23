'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout } from '@/lib/auth-client'
import LoadingScreen from '@/components/LoadingScreen'
import MemberHeader from '@/components/MemberHeader'
import styles from './page.module.css'

interface WaitlistEntry {
  id: string
  status: 'waiting' | 'confirmed' | 'expired'
  position: number
  created_at: string
  confirmed_at?: string
  classDate: {
    date: string
  }
  class: {
    name: string
    start_time: string
    end_time: string
    venue: string
  }
}

export default function WaitlistPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/')
        return
      }

      try {
        const res = await fetch('/api/member/waitlist')
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setEntries(data.waitlist)
          }
        }
      } catch (e) {
        console.error('Fetch waitlist error:', e)
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

  const handleCancelWaitlist = async (entryId: string) => {
    if (!confirm('キャンセル待ちを解除しますか？チケットは未使用のまま、別のクラスを選択できます。')) return
    setCancelingId(entryId)
    try {
      const res = await fetch(`/api/member/waitlist/${entryId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setEntries((prev) => prev.filter((e) => e.id !== entryId))
      } else {
        alert(data.error || '解除に失敗しました')
      }
    } catch (e) {
      alert('通信エラーが発生しました')
    } finally {
      setCancelingId(null)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting':
        return '待機中'
      case 'confirmed':
        return '確定済み'
      case 'expired':
        return '失効'
      default:
        return status
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'waiting':
        return styles.statusWaiting
      case 'confirmed':
        return styles.statusConfirmed
      case 'expired':
        return styles.statusExpired
      default:
        return ''
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className={styles.container}>
      <MemberHeader user={null} onLogout={handleLogout} />

      <main className={styles.main}>
        {entries.length === 0 ? (
          <div className={styles.emptyMessage}>キャンセル待ちはありません</div>
        ) : (
          <div className={styles.list}>
            {entries.map((entry) => {
              const dateObj = new Date(entry.classDate.date)
              return (
                <div key={entry.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.className}>{entry.class.name}</h2>
                    <span className={`${styles.statusBadge} ${getStatusClass(entry.status)}`}>
                      {getStatusLabel(entry.status)}
                    </span>
                  </div>
                  <p className={styles.classDate}>
                    {dateObj.toLocaleDateString('ja-JP', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </p>
                  <p className={styles.classTime}>
                    {entry.class.start_time} - {entry.class.end_time}
                  </p>
                  <p className={styles.classVenue}>会場: {entry.class.venue}</p>
                  <p className={styles.position}>現在の順番: 第{entry.position}番</p>
                  {entry.status === 'waiting' && (
                    <button
                      className={styles.cancelButton}
                      onClick={() => handleCancelWaitlist(entry.id)}
                      disabled={cancelingId === entry.id}
                    >
                      {cancelingId === entry.id ? '処理中...' : 'キャンセル待ちを解除'}
                    </button>
                  )}
                  {entry.status === 'confirmed' && entry.confirmed_at && (
                    <p className={styles.confirmedAt}>
                      繰り上がり日時:{' '}
                      {new Date(entry.confirmed_at).toLocaleString('ja-JP')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

