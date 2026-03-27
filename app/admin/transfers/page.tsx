'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { getCurrentUser } from '@/lib/auth-client'
import LoadingScreen from '@/components/LoadingScreen'
import styles from './page.module.css'

interface Transfer {
  id: string
  status: 'unused' | 'used' | 'expired'
  issued_at: string
  expires_at: string
  used_at?: string
  member?: {
    id: string
    name: string
    grade: string
  }
  originalClass?: {
    name: string
  }
  originalClassDate?: {
    date: string
  }
  usedClass?: {
    name: string
  }
}

interface FormMember {
  id: string
  name: string
  grade: string
}

interface FormClass {
  id: string
  name: string
}

interface FormClassDate {
  id: string
  class_id: string
  date: string
}

export default function TransfersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unused' | 'used' | 'expired'>('all')

  const [members, setMembers] = useState<FormMember[]>([])
  const [classes, setClasses] = useState<FormClass[]>([])
  const [classDates, setClassDates] = useState<FormClassDate[]>([])
  const [manualMemberId, setManualMemberId] = useState('')
  const [manualClassId, setManualClassId] = useState('')
  const [manualClassDateId, setManualClassDateId] = useState('')
  const [manualExpires, setManualExpires] = useState('')
  const [manualMarkAbsent, setManualMarkAbsent] = useState(true)
  const [manualSubmitting, setManualSubmitting] = useState(false)

  const [extendTarget, setExtendTarget] = useState<Transfer | null>(null)
  const [extendDate, setExtendDate] = useState('')
  const [extendSubmitting, setExtendSubmitting] = useState(false)

  const fetchTransfers = useCallback(async () => {
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
  }, [filter])

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/')
        return
      }
      setUser(currentUser)
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!user) return
    fetchTransfers()
  }, [user, fetchTransfers])

  useEffect(() => {
    if (!user) return
    const loadForm = async () => {
      const start = new Date()
      start.setMonth(start.getMonth() - 12)
      const startStr = start.toISOString().slice(0, 10)
      try {
        const [mRes, cRes, dRes] = await Promise.all([
          fetch('/api/admin/members'),
          fetch('/api/admin/classes'),
          fetch(`/api/admin/class-dates?sort=desc&startDate=${startStr}`),
        ])
        if (mRes.ok) {
          const d = await mRes.json()
          if (d.success) setMembers(d.members || [])
        }
        if (cRes.ok) {
          const d = await cRes.json()
          if (d.success) {
            setClasses(
              (d.classes || []).filter((x: { is_active?: boolean }) => x.is_active !== false)
            )
          }
        }
        if (dRes.ok) {
          const d = await dRes.json()
          if (d.success) setClassDates(d.classDates || [])
        }
      } catch (e) {
        console.error(e)
      }
    }
    loadForm()
  }, [user])

  const datesForClass = useMemo(() => {
    if (!manualClassId) return []
    return classDates
      .filter((cd) => cd.class_id === manualClassId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [classDates, manualClassId])

  useEffect(() => {
    setManualClassDateId('')
  }, [manualClassId])

  const handleManualIssue = async () => {
    if (!manualMemberId || !manualClassDateId) {
      toast.error('会員と開催日を選択してください')
      return
    }
    setManualSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        memberId: manualMemberId,
        classDateId: manualClassDateId,
        markAbsent: manualMarkAbsent,
      }
      if (manualExpires.trim()) {
        const d = new Date(manualExpires)
        d.setHours(23, 59, 59, 999)
        body.expiresAt = d.toISOString()
      }
      const res = await fetch('/api/admin/transfers/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || '発行に失敗しました')
        return
      }
      toast.success(data.message)
      setManualClassDateId('')
      await fetchTransfers()
    } catch {
      toast.error('エラーが発生しました')
    } finally {
      setManualSubmitting(false)
    }
  }

  const openExtend = (t: Transfer) => {
    const d = new Date(t.expires_at)
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    next.setHours(23, 59, 59, 999)
    const pick = next > d ? next : new Date(d.getTime() + 86400000 * 30)
    setExtendDate(pick.toISOString().slice(0, 10))
    setExtendTarget(t)
  }

  const handleExtend = async () => {
    if (!extendTarget || !extendDate) return
    setExtendSubmitting(true)
    try {
      const d = new Date(extendDate)
      d.setHours(23, 59, 59, 999)
      const res = await fetch(`/api/admin/transfers/${extendTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_at: d.toISOString() }),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || '更新に失敗しました')
        return
      }
      toast.success('有効期限を更新しました')
      setExtendTarget(null)
      await fetchTransfers()
    } catch {
      toast.error('エラーが発生しました')
    } finally {
      setExtendSubmitting(false)
    }
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
        <section className={styles.manualSection}>
          <h2 className={styles.manualTitle}>手動で振替チケットを発行（イレギュラー対応）</h2>
          <p className={styles.manualHint}>
            連絡が間に合わなかった欠席など、事務局で振替チケットを付与できます。必要に応じて同時に<strong>欠席</strong>も名簿に反映します。
            通常の欠席登録のみの場合は、該当開催日の<strong>出欠名簿</strong>から「欠席」に変更してください。
            ※会員リストは直近100名までです。対象がいない場合は会員一覧で検索のうえ、発行後に名簿で欠席操作することもできます。
          </p>
          <div className={styles.manualGrid}>
            <label className={styles.manualField}>
              <span>会員</span>
              <select
                value={manualMemberId}
                onChange={(e) => setManualMemberId(e.target.value)}
                className={styles.manualSelect}
              >
                <option value="">選択</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}（{m.grade}）
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.manualField}>
              <span>クラス</span>
              <select
                value={manualClassId}
                onChange={(e) => setManualClassId(e.target.value)}
                className={styles.manualSelect}
              >
                <option value="">選択</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.manualField}>
              <span>開催日（欠席対象の日）</span>
              <select
                value={manualClassDateId}
                onChange={(e) => setManualClassDateId(e.target.value)}
                className={styles.manualSelect}
                disabled={!manualClassId}
              >
                <option value="">選択</option>
                {datesForClass.map((cd) => (
                  <option key={cd.id} value={cd.id}>
                    {new Date(cd.date).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.manualField}>
              <span>有効期限（任意・空欄は通常ルール2ヶ月相当と同じ計算）</span>
              <input
                type="date"
                value={manualExpires}
                onChange={(e) => setManualExpires(e.target.value)}
                className={styles.manualInput}
              />
            </label>
          </div>
          <label className={styles.manualCheckbox}>
            <input
              type="checkbox"
              checked={manualMarkAbsent}
              onChange={(e) => setManualMarkAbsent(e.target.checked)}
            />
            同時に出欠名簿を欠席にする
          </label>
          <button
            type="button"
            className={styles.manualButton}
            onClick={handleManualIssue}
            disabled={manualSubmitting}
          >
            {manualSubmitting ? '発行中...' : '振替チケットを発行'}
          </button>
        </section>

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
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td>{new Date(transfer.issued_at).toLocaleDateString('ja-JP')}</td>
                  <td>
                    {transfer.member ? (
                      <>
                        {transfer.member.name} ({transfer.member.grade})
                      </>
                    ) : (
                      <span className={styles.notUsed}>（退会/削除済み）</span>
                    )}
                  </td>
                  <td>
                    {transfer.originalClass?.name || '（クラス不明）'}
                    <br />
                    <span className={styles.dateText}>
                      {transfer.originalClassDate?.date
                        ? new Date(transfer.originalClassDate.date).toLocaleDateString('ja-JP')
                        : '（日付不明）'}
                    </span>
                  </td>
                  <td>
                    {transfer.usedClass ? (
                      <span>
                        {transfer.usedClass.name}
                        {transfer.used_at && (
                          <span className={styles.dateText}>
                            {' '}
                            ({new Date(transfer.used_at).toLocaleDateString('ja-JP')})
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
                  <td>
                    {(transfer.status === 'unused' || transfer.status === 'expired') && (
                      <button
                        type="button"
                        className={styles.extendButton}
                        onClick={() => openExtend(transfer)}
                      >
                        期限延長
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {transfers.length === 0 && (
          <div className={styles.emptyMessage}>振替履歴がありません</div>
        )}

        {extendTarget && (
          <div
            className={styles.modalOverlay}
            onClick={() => !extendSubmitting && setExtendTarget(null)}
            role="presentation"
          >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog">
              <h3 className={styles.modalHeading}>有効期限の延長</h3>
              <p className={styles.modalText}>
                {extendTarget.member?.name}様のチケット（未使用・失効のみ変更可能）。休会や事務局判断で延長する場合に利用してください。
              </p>
              <label className={styles.manualField}>
                <span>新しい有効期限</span>
                <input
                  type="date"
                  value={extendDate}
                  onChange={(e) => setExtendDate(e.target.value)}
                  className={styles.manualInput}
                />
              </label>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalPrimary}
                  onClick={handleExtend}
                  disabled={extendSubmitting}
                >
                  {extendSubmitting ? '保存中...' : '保存'}
                </button>
                <button
                  type="button"
                  className={styles.modalSecondary}
                  onClick={() => setExtendTarget(null)}
                  disabled={extendSubmitting}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
