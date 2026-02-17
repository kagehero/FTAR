'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { loginWithEmail } from '@/lib/auth-client'
import styles from './page.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await loginWithEmail(email, password)

      if (!result.success) {
        toast.error(result.error || 'ログインに失敗しました')
        setLoading(false)
        return
      }

      if (result.user) {
        toast.success('ログインしました')
        if (result.user.role === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/member/home')
        }
      }
    } catch (err) {
      toast.error('予期しないエラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.header}>
          <h1 className={styles.title}>ログイン</h1>
          <p className={styles.subtitle}>アカウントにログインしてください</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="example@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>

          <div className={styles.registerLink}>
            <span>アカウントをお持ちでないですか？</span>
            <Link href="/register" className={styles.link}>
              新規登録
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
