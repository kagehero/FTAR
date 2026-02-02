'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-client'
import styles from './page.module.css'

interface Member {
  id: string
  name: string
  email: string
  grade: string
  phone?: string
  status: 'active' | 'suspended' | 'withdrawn'
  is_active: boolean
  created_at: string
}

export default function MembersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

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
        if (search) params.append('search', search)
        if (gradeFilter) params.append('grade', gradeFilter)
        if (statusFilter) params.append('status', statusFilter)

        const res = await fetch(`/api/admin/members?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setMembers(data.members)
          }
        }
      } catch (error) {
        console.error('Fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, search, gradeFilter, statusFilter])

  const getStatusLabel = (status: string, isActive: boolean) => {
    if (!isActive) return '無効'
    switch (status) {
      case 'active':
        return '在籍'
      case 'suspended':
        return '休会'
      case 'withdrawn':
        return '退会'
      default:
        return status
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
          <h1 className={styles.title}>会員一覧</h1>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.filters}>
          <input
            type="text"
            placeholder="名前・メールで検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">すべての学年</option>
            <option value="年少">年少</option>
            <option value="年中">年中</option>
            <option value="年長">年長</option>
            <option value="小学1年">小学1年</option>
            <option value="小学2年">小学2年</option>
            <option value="小学3年">小学3年</option>
            <option value="小学4年">小学4年</option>
            <option value="小学5年">小学5年</option>
            <option value="小学6年">小学6年</option>
            <option value="中学1年">中学1年</option>
            <option value="中学2年">中学2年</option>
            <option value="中学3年">中学3年</option>
            <option value="高校1年">高校1年</option>
            <option value="高校2年">高校2年</option>
            <option value="高校3年">高校3年</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">すべての状態</option>
            <option value="active">在籍</option>
            <option value="suspended">休会</option>
            <option value="withdrawn">退会</option>
          </select>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>氏名</th>
                <th>メール</th>
                <th>学年</th>
                <th>電話番号</th>
                <th>状態</th>
                <th>登録日</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{member.grade}</td>
                  <td>{member.phone || '-'}</td>
                  <td>
                    <span
                      className={
                        member.is_active && member.status === 'active'
                          ? styles.statusActive
                          : styles.statusInactive
                      }
                    >
                      {getStatusLabel(member.status, member.is_active)}
                    </span>
                  </td>
                  <td>{new Date(member.created_at).toLocaleDateString('ja-JP')}</td>
                  <td>
                    <button
                      className={styles.detailButton}
                      onClick={() => router.push(`/admin/members/${member.id}`)}
                    >
                      詳細
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {members.length === 0 && (
          <div className={styles.emptyMessage}>会員が見つかりません</div>
        )}
      </main>
    </div>
  )
}
