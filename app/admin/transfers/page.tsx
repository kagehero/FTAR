'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-client'
import styles from './page.module.css'

interface Transfer {
  id: string
  status: 'unused' | 'used' | 'expired'
  issued_at: string
  expires_at: string
  used_at?: string
  member: {
    id: string
    name: string
    grade: string
  }
  originalClass: {
    name: string
  }
  originalClassDate: {
    date: string
  }
  usedClass?: {
    name: string
  }
}

export default function TransfersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unused' | 'used' | 'expired'>('all')

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/')
        return
      }
      setUser(currentUser)

      try {
        const params = new URLSearchParams()
        if (filter !== 'all') {
          params.append('status', filter)
        }

        const res = await fetch(`/api/admin/transfers?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setTransfers(data.transfers)
          }
        }
      } catch (error) {
        console.error('Fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, filter])

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'unused':
        return '未使用'
      case 'used':
        return '使用済み'
      case 'expired':
        return '失効'
      default:
        return status
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'unused':
        return styles.statusUnused
      case 'used':
        return styles.statusUsed
      case 'expired':
        return styles.statusExpired
      default:
        return ''
    }
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
          <button onClick={() => router.back()} className={styles.backButton}>
            ← 戻る
          </button>
          <h1 className={styles.title}>振替管理</h1>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.filters}>
          <button
            className={filter === 'all' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilter('all')}
          >
            すべて
          </button>
          <button
            className={filter === 'unused' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilter('unused')}
          >
            未使用
          </button>
          <button
            className={filter === 'used' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilter('used')}
          >
            使用済み
          </button>
          <button
            className={filter === 'expired' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilter('expired')}
          >
            失効
          </button>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>発行日</th>
                <th>会員名</th>
                <th>欠席クラス</th>
                <th>振替先</th>
                <th>有効期限</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td>{new Date(transfer.issued_at).toLocaleDateString('ja-JP')}</td>
                  <td>
                    {transfer.member.name} ({transfer.member.grade})
                  </td>
                  <td>
                    {transfer.originalClass.name}
                    <br />
                    <span className={styles.dateText}>
                      {new Date(transfer.originalClassDate.date).toLocaleDateString('ja-JP')}
                    </span>
                  </td>
                  <td>
                    {transfer.usedClass ? (
                      <span>
                        {transfer.usedClass.name}
                        {transfer.used_at && (
                          <span className={styles.dateText}>
                            {' '}
                            (
                            {new Date(transfer.used_at).toLocaleDateString('ja-JP')}
                            )
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className={styles.notUsed}>未使用</span>
                    )}
                  </td>
                  <td>{new Date(transfer.expires_at).toLocaleDateString('ja-JP')}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusClass(transfer.status)}`}>
                      {getStatusLabel(transfer.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {transfers.length === 0 && (
          <div className={styles.emptyMessage}>振替履歴がありません</div>
        )}
      </main>
    </div>
  )
}
