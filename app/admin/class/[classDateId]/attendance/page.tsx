'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-client'
import styles from './page.module.css'

interface Member {
  id: string
  name: string
  grade: string
  email: string
}

interface AttendanceData {
  member: Member
  attendance: {
    id: string
    status: string
    registered_at: string
    changed_by?: string
  }
}

interface WaitlistData {
  member: Member
  waitlist: {
    id: string
    position: number
    status: string
  }
}

export default function AttendanceListPage() {
  const router = useRouter()
  const params = useParams()
  const classDateId = params.classDateId as string

  const [user, setUser] = useState<any>(null)
  const [classInfo, setClassInfo] = useState<any>(null)
  const [classDate, setClassDate] = useState<any>(null)
  const [attendances, setAttendances] = useState<AttendanceData[]>([])
  const [absences, setAbsences] = useState<AttendanceData[]>([])
  const [unregistered, setUnregistered] = useState<Member[]>([])
  const [waitlists, setWaitlists] = useState<WaitlistData[]>([])
  const [loading, setLoading] = useState(true)
  const [editingMember, setEditingMember] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/')
        return
      }
      setUser(currentUser)

      try {
        const res = await fetch(`/api/admin/class/${classDateId}/attendance`)
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setClassInfo(data.class)
            setClassDate(data.classDate)
            setAttendances(data.attendances)
            setAbsences(data.absences)
            setUnregistered(data.unregistered)
            setWaitlists(data.waitlists)
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

  const handleStatusChange = async (memberId: string, newStatus: 'attending' | 'absent') => {
    try {
      const res = await fetch(`/api/admin/class/${classDateId}/attendance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, status: newStatus }),
      })

      const data = await res.json()
      if (data.success) {
        window.location.reload()
      } else {
        alert(data.error || '更新に失敗しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>読み込み中...</div>
      </div>
    )
  }

  const classDateTime = classDate ? new Date(classDate.date) : null
  const [hours, minutes] = classInfo?.start_time?.split(':') || [0, 0]
  if (classDateTime) {
    classDateTime.setHours(Number(hours), Number(minutes), 0, 0)
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
        </div>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>出席</span>
            <span className={styles.statValue}>{attendances.length}名</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>欠席</span>
            <span className={styles.statValue}>{absences.length}名</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>未登録</span>
            <span className={styles.statValue}>{unregistered.length}名</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>待ち</span>
            <span className={styles.statValue}>{waitlists.length}名</span>
          </div>
        </div>

        {/* 出席者 */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>出席 ({attendances.length}名)</h3>
          <div className={styles.memberList}>
            {attendances.map((item) => (
              <div key={item.member.id} className={styles.memberCard}>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{item.member.name}</span>
                  <span className={styles.memberGrade}>{item.member.grade}</span>
                </div>
                <div className={styles.memberActions}>
                  <button
                    className={styles.changeButton}
                    onClick={() => handleStatusChange(item.member.id, 'absent')}
                  >
                    欠席に変更
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 欠席者 */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>欠席 ({absences.length}名)</h3>
          <div className={styles.memberList}>
            {absences.map((item) => (
              <div key={item.member.id} className={styles.memberCard}>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{item.member.name}</span>
                  <span className={styles.memberGrade}>{item.member.grade}</span>
                </div>
                <div className={styles.memberActions}>
                  <button
                    className={styles.changeButton}
                    onClick={() => handleStatusChange(item.member.id, 'attending')}
                  >
                    出席に変更
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 未登録者 */}
        {unregistered.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>未登録 ({unregistered.length}名)</h3>
            <div className={styles.memberList}>
              {unregistered.map((member) => (
                <div key={member.id} className={styles.memberCard}>
                  <div className={styles.memberInfo}>
                    <span className={styles.memberName}>{member.name}</span>
                    <span className={styles.memberGrade}>{member.grade}</span>
                  </div>
                  <div className={styles.memberActions}>
                    <button
                      className={styles.changeButton}
                      onClick={() => handleStatusChange(member.id, 'attending')}
                    >
                      出席に登録
                    </button>
                    <button
                      className={styles.changeButton}
                      onClick={() => handleStatusChange(member.id, 'absent')}
                    >
                      欠席に登録
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* キャンセル待ち */}
        {waitlists.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>キャンセル待ち ({waitlists.length}名)</h3>
            <div className={styles.memberList}>
              {waitlists.map((item) => (
                <div key={item.member.id} className={styles.memberCard}>
                  <div className={styles.memberInfo}>
                    <span className={styles.memberName}>{item.member.name}</span>
                    <span className={styles.memberGrade}>{item.member.grade}</span>
                    <span className={styles.waitPosition}>順番: {item.waitlist.position}</span>
                  </div>
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
                <th className={styles.printThCheck}>出席確認</th>
                <th className={styles.printThNotes}>備考</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map((item, index) => (
                <tr key={item.member.id}>
                  <td className={styles.printTd}>{index + 1}</td>
                  <td className={styles.printTd}>{item.member.name}</td>
                  <td className={styles.printTd}>{item.member.grade}</td>
                  <td className={styles.printTd}></td>
                  <td className={styles.printTd}></td>
                </tr>
              ))}
              {absences.map((item, index) => (
                <tr key={item.member.id}>
                  <td className={styles.printTd}>{attendances.length + index + 1}</td>
                  <td className={styles.printTd}>{item.member.name}</td>
                  <td className={styles.printTd}>{item.member.grade}</td>
                  <td className={styles.printTd}></td>
                  <td className={styles.printTd}>欠席</td>
                </tr>
              ))}
              {unregistered.map((member, index) => (
                <tr key={member.id}>
                  <td className={styles.printTd}>
                    {attendances.length + absences.length + index + 1}
                  </td>
                  <td className={styles.printTd}>{member.name}</td>
                  <td className={styles.printTd}>{member.grade}</td>
                  <td className={styles.printTd}></td>
                  <td className={styles.printTd}>未登録</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
