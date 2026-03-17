'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { registerWithEmail } from '@/lib/auth-client'
import { GRADE_OPTIONS } from '@/lib/constants'
import styles from './page.module.css'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // パスワードを入力した場合のみバリデーション
    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        toast.error('パスワードが一致しません')
        return
      }

      if (password.length < 6) {
        toast.error('パスワードは6文字以上で入力してください')
        return
      }
    }

    setLoading(true)

    try {
      const result = await registerWithEmail(email, password, name, grade)

      if (!result.success) {
        toast.error(result.error || '登録に失敗しました')
        setLoading(false)
        return
      }

      if (result.user) {
        toast.success('登録が完了しました')
        router.push('/member/home')
      }
    } catch (err) {
      toast.error('予期しないエラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.registerBox}>
        <div className={styles.header}>
          <h1 className={styles.title}>新規登録</h1>
          <p className={styles.subtitle}>新しいアカウントを作成してください</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>
              氏名
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              placeholder="山田 太郎"
              required
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="grade" className={styles.label}>
              対象学年
            </label>
            <select
              id="grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className={styles.input}
              required
              disabled={loading}
            >
              <option value="">選択してください</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

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
              パスワード（任意）
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="未入力の場合は自動生成されます（6文字以上推奨）"
              disabled={loading}
              minLength={6}
            />
            <p className={styles.hint}>
              入力しない場合はシステムが安全なパスワードを自動で発行します。
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>
              パスワード（確認・任意）
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              placeholder="入力した場合のみ確認が必要です"
              disabled={loading}
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? '登録中...' : '登録'}
          </button>

          <div className={styles.loginLink}>
            <span>既にアカウントをお持ちですか？</span>
            <Link href="/" className={styles.link}>
              ログイン
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
