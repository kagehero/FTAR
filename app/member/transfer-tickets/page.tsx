'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout } from '@/lib/auth-client'
import LoadingScreen from '@/components/LoadingScreen'
import MemberHeader from '@/components/MemberHeader'
import styles from './page.module.css'

interface TransferTicket {
  id: string
  status: 'unused' | 'used' | 'expired'
  issued_at: string
  expires_at: string
  used_at?: string
  class: {
    name: string
  }
  classDate: {
    date: string
  }
  usedClass?: {
    name: string
  }
}

export default function TransferTicketsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [tickets, setTickets] = useState<TransferTicket[]>([])
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
        const res = await fetch('/api/member/transfer-tickets')
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setTickets(data.tickets)
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
    return <LoadingScreen />
  }

  const unusedTickets = tickets.filter((t) => t.status === 'unused')
  const usedTickets = tickets.filter((t) => t.status === 'used')
  const expiredTickets = tickets.filter((t) => t.status === 'expired')

  return (
    <div className={styles.container}>
      <MemberHeader user={user} onLogout={handleLogout} />

      <main className={styles.main}>
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>未使用</span>
            <span className={styles.summaryValue}>{unusedTickets.length}枚</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>使用済み</span>
            <span className={styles.summaryValue}>{usedTickets.length}枚</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>失効</span>
            <span className={styles.summaryValue}>{expiredTickets.length}枚</span>
          </div>
        </div>

        {/* 未使用チケット */}
        {unusedTickets.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>未使用チケット</h2>
            <div className={styles.ticketsList}>
              {unusedTickets.map((ticket) => (
                <div key={ticket.id} className={styles.ticketCard}>
                  <div className={styles.ticketHeader}>
                    <h3 className={styles.ticketClass}>{ticket.class.name}</h3>
                    <span className={`${styles.statusBadge} ${getStatusClass(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                  <div className={styles.ticketInfo}>
                    <p className={styles.ticketDate}>
                      発行日: {new Date(ticket.issued_at).toLocaleDateString('ja-JP')}
                    </p>
                    <p className={styles.ticketExpiry}>
                      有効期限: {new Date(ticket.expires_at).toLocaleDateString('ja-JP')}
                    </p>
                    <p className={styles.originalClass}>
                      欠席クラス: {new Date(ticket.classDate.date).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <button
                    className={styles.useButton}
                    onClick={() => router.push(`/member/transfer/select/${ticket.id}`)}
                  >
                    振替先を選択
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 使用済みチケット */}
        {usedTickets.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>使用済みチケット</h2>
            <div className={styles.ticketsList}>
              {usedTickets.map((ticket) => (
                <div key={ticket.id} className={styles.ticketCard}>
                  <div className={styles.ticketHeader}>
                    <h3 className={styles.ticketClass}>{ticket.class.name}</h3>
                    <span className={`${styles.statusBadge} ${getStatusClass(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                  <div className={styles.ticketInfo}>
                    <p className={styles.ticketDate}>
                      発行日: {new Date(ticket.issued_at).toLocaleDateString('ja-JP')}
                    </p>
                    {ticket.used_at && (
                      <p className={styles.ticketUsed}>
                        使用日: {new Date(ticket.used_at).toLocaleDateString('ja-JP')}
                      </p>
                    )}
                    {ticket.usedClass && (
                      <p className={styles.usedClass}>
                        振替先: {ticket.usedClass.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 失効チケット */}
        {expiredTickets.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>失効チケット</h2>
            <div className={styles.ticketsList}>
              {expiredTickets.map((ticket) => (
                <div key={ticket.id} className={`${styles.ticketCard} ${styles.expiredCard}`}>
                  <div className={styles.ticketHeader}>
                    <h3 className={styles.ticketClass}>{ticket.class.name}</h3>
                    <span className={`${styles.statusBadge} ${getStatusClass(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                  <div className={styles.ticketInfo}>
                    <p className={styles.ticketDate}>
                      発行日: {new Date(ticket.issued_at).toLocaleDateString('ja-JP')}
                    </p>
                    <p className={styles.ticketExpiry}>
                      有効期限: {new Date(ticket.expires_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tickets.length === 0 && (
          <div className={styles.emptyMessage}>振替チケットはありません</div>
        )}
      </main>
    </div>
  )
}
