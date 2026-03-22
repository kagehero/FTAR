'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { getCurrentUser } from '@/lib/auth-client'
import LoadingScreen from '@/components/LoadingScreen'
import styles from './page.module.css'

interface Member {
  id: string
  name: string
  grade: string
  email?: string
}

interface StudentRow {
  member: Member
  status: 'attending' | 'absent' | 'waiting' | 'unregistered'
}

interface WaitlistData {
  member: Member
  waitlist: { id: string; position: number; status: string }
}

export default function AttendanceListPage() {
  const router = useRouter()
  const params = useParams()
  const classDateId = params.classDateId as string

  const [classInfo, setClassInfo] = useState<any>(null)
  const [classDate, setClassDate] = useState<any>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [waitlists, setWaitlists] = useState<WaitlistData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [isCancelled, setIsCancelled] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/')
        return
      }

      try {
        const res = await fetch(`/api/admin/class/${classDateId}/attendance`)
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setClassInfo(data.class)
            setClassDate(data.classDate)
            setIsCancelled(
              data.classDate?.is_cancelled ||
                data.classDate?.session_status === 'cancelled'
            )

            const rows: StudentRow[] = []
            data.attendances?.forEach((a: any) =>
              rows.push({ member: a.member, status: 'attending' })
            )
            data.waitings?.forEach((w: any) =>
              rows.push({ member: w.member, status: 'waiting' })
            )
            data.absences?.forEach((a: any) =>
              rows.push({ member: a.member, status: 'absent' })
            )
            data.unregistered?.forEach((m: Member) =>
              rows.push({ member: m, status: 'unregistered' })
            )
            rows.sort((a, b) => a.member.name.localeCompare(b.member.name))
            setStudents(rows)
            setWaitlists(data.waitlists || [])
          }
        }
      } catch (error) {
        console.error('Fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [classDateId, router])

  const handleStatusChange = async (
    memberId: string,
    newStatus: 'attending' | 'absent' | 'waiting'
  ) => {
    if (isCancelled) return
    setSaving(memberId)
    try {
      const res = await fetch(`/api/admin/class/${classDateId}/attendance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('出欠を更新しました')
        setStudents((prev) =>
          prev.map((s) =>
            s.member.id === memberId ? { ...s, status: newStatus } : s
          )
        )
      } else {
        toast.error(data.error || '更新に失敗しました')
      }
    } catch (error) {
      toast.error('エラーが発生しました')
    } finally {
      setSaving(null)
    }
  }

  const handlePrint = () => window.print()

  if (loading) {
    return <LoadingScreen />
  }

  const classDateTime = classDate ? new Date(classDate.date) : null
  const [hours, minutes] = classInfo?.start_time?.split(':') || [0, 0]
  if (classDateTime) {
    classDateTime.setHours(Number(hours), Number(minutes), 0, 0)
  }

  const counts = {
    attending: students.filter((s) => s.status === 'attending').length,
    absent: students.filter((s) => s.status === 'absent').length,
    waiting: students.filter((s) => s.status === 'waiting').length,
    unregistered: students.filter((s) => s.status === 'unregistered').length,
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← 戻る
          </button>
          <h1 className={styles.title}>出欠名簿</h1>
          <button onClick={handlePrint} className={styles.printButton}>
            🖨️ 印刷
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.classInfo}>
          <h2 className={styles.className}>{classInfo?.name}</h2>
          <p className={styles.classDate}>
            {classDateTime?.toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}
          </p>
          <p className={styles.classTime}>
            {classInfo?.start_time} - {classInfo?.end_time} @ {classInfo?.venue}
          </p>
          {isCancelled && (
            <div className={styles.cancelledNotice}>中止のため出欠操作はできません</div>
          )}
        </div>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>○ 出席</span>
            <span className={styles.statValue}>{counts.attending}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>× 欠席</span>
            <span className={styles.statValue}>{counts.absent}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>△ 待ち</span>
            <span className={styles.statValue}>{counts.waiting}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>未登録</span>
            <span className={styles.statValue}>{counts.unregistered}</span>
          </div>
        </div>

        <div className={styles.coachList}>
          <p className={styles.tapHint}>タップで出欠を記録</p>
          {students.map((row) => (
            <div key={row.member.id} className={styles.studentRow}>
              <div className={styles.studentInfo}>
                <span className={styles.memberName}>{row.member.name}</span>
                <span className={styles.memberGrade}>{row.member.grade}</span>
              </div>
              <div className={styles.tapButtons}>
                <button
                  className={`${styles.tapBtn} ${styles.tapAttend} ${row.status === 'attending' ? styles.tapActive : ''}`}
                  onClick={() => handleStatusChange(row.member.id, 'attending')}
                  disabled={isCancelled || saving === row.member.id}
                  title="出席"
                >
                  ○
                </button>
                <button
                  className={`${styles.tapBtn} ${styles.tapAbsent} ${row.status === 'absent' ? styles.tapActive : ''}`}
                  onClick={() => handleStatusChange(row.member.id, 'absent')}
                  disabled={isCancelled || saving === row.member.id}
                  title="欠席"
                >
                  ×
                </button>
                <button
                  className={`${styles.tapBtn} ${styles.tapWaiting} ${row.status === 'waiting' ? styles.tapActive : ''}`}
                  onClick={() => handleStatusChange(row.member.id, 'waiting')}
                  disabled={isCancelled || saving === row.member.id}
                  title="待ち（遅刻予定等）"
                >
                  △
                </button>
              </div>
            </div>
          ))}
        </div>

        {waitlists.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>キャンセル待ち ({waitlists.length}名)</h3>
            <div className={styles.waitlistList}>
              {waitlists.map((item) => (
                <div key={item.member.id} className={styles.waitlistItem}>
                  <span className={styles.memberName}>{item.member.name}</span>
                  <span className={styles.memberGrade}>{item.member.grade}</span>
                  <span className={styles.waitPosition}>順番: {item.waitlist.position}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 印刷用名簿 */}
        <div className={styles.printRoster}>
          <div className={styles.printHeader}>
            <h2 className={styles.printClassName}>{classInfo?.name}</h2>
            <p className={styles.printDate}>
              {classDateTime?.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </p>
            <p className={styles.printTime}>
              {classInfo?.start_time} - {classInfo?.end_time}
            </p>
          </div>
          <table className={styles.printTable}>
            <thead>
              <tr>
                <th className={styles.printThNo}>No</th>
                <th className={styles.printThName}>氏名</th>
                <th className={styles.printThGrade}>学年</th>
                <th className={styles.printThCheck}>出席</th>
                <th className={styles.printThNotes}>備考</th>
              </tr>
            </thead>
            <tbody>
              {students.map((row, index) => (
                <tr key={row.member.id}>
                  <td className={styles.printTd}>{index + 1}</td>
                  <td className={styles.printTd}>{row.member.name}</td>
                  <td className={styles.printTd}>{row.member.grade}</td>
                  <td className={styles.printTd}>
                    {row.status === 'attending' ? '○' : row.status === 'absent' ? '×' : row.status === 'waiting' ? '△' : ''}
                  </td>
                  <td className={styles.printTd}>
                    {row.status === 'attending' ? '' : row.status === 'absent' ? '欠席' : row.status === 'waiting' ? '待ち' : '未'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
