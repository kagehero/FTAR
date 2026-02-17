'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { getCurrentUser } from '@/lib/auth-client'
import styles from './page.module.css'

interface TransferOption {
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
    capacity: number
    category: string
  }
  attendingCount: number
  waitCount: number
  hasCapacity: boolean
}

export default function TransferSelectPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.ticketId as string

  const [user, setUser] = useState<any>(null)
  const [options, setOptions] = useState<TransferOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/')
        return
      }
      setUser(currentUser)

      try {
        const res = await fetch(`/api/member/transfer/select/${ticketId}`)
        const data = await res.json()
        if (!data.success) {
          toast.error(data.error || '候補の取得に失敗しました')
        } else {
          setOptions(data.options)
        }
      } catch (e) {
        toast.error('予期しないエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, ticketId])

  const handleSelect = async (classDateId: string) => {
    setSubmitting(true)

    try {
      const res = await fetch(`/api/member/transfer/select/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classDateId }),
      })

      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || '振替に失敗しました')
        setSubmitting(false)
        return
      }

      toast.success('振替を登録しました')
      router.push('/member/transfer-tickets')
    } catch (e) {
      toast.error('予期しないエラーが発生しました')
      setSubmitting(false)
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
      <div className={styles.content}>
        <h1 className={styles.title}>振替先選択</h1>

        {options.length === 0 ? (
          <div className={styles.emptyMessage}>現在、振替可能なクラスはありません</div>
        ) : (
          <div className={styles.optionsList}>
            {options.map((option) => {
              const dateObj = new Date(option.classDate.date)
              const remaining = option.class.capacity - option.attendingCount

              return (
                <div key={option.classDate.id} className={styles.optionCard}>
                  <div className={styles.optionHeader}>
                    <h2 className={styles.className}>{option.class.name}</h2>
                    <span
                      className={`${styles.capacityBadge} ${
                        option.hasCapacity ? styles.capacityAvailable : styles.capacityFull
                      }`}
                    >
                      {option.hasCapacity ? '空きあり' : '満席'}
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
                    {option.class.start_time} - {option.class.end_time}
                  </p>
                  <p className={styles.classVenue}>会場: {option.class.venue}</p>
                  <p className={styles.capacityInfo}>
                    定員 {option.class.capacity}名 / 予約 {option.attendingCount}名 / 空き{' '}
                    {Math.max(0, remaining)}名
                  </p>
                  <p className={styles.waitInfo}>キャンセル待ち人数: {option.waitCount}人</p>

                  <button
                    className={styles.selectButton}
                    onClick={() => handleSelect(option.classDate.id)}
                    disabled={submitting}
                  >
                    {option.hasCapacity ? 'このクラスに振替' : 'このクラスでキャンセル待ち'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <button
          className={styles.backButton}
          onClick={() => router.back()}
          disabled={submitting}
        >
          戻る
        </button>
      </div>
    </div>
  )
}

