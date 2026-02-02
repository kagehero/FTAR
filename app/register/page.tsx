'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerWithEmail } from '@/lib/auth-client'
import styles from './page.module.css'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // パスワード確認
    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    // パスワードの長さチェック
    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }

    setLoading(true)

    try {
      const result = await registerWithEmail(email, password, name, grade)

      if (!result.success) {
        setError(result.error || '登録に失敗しました')
        setLoading(false)
        return
      }

      if (result.user) {
        // 登録成功後、ログインページにリダイレクト
        // または自動ログインして会員ホームにリダイレクト
        router.push('/member/home')
      }
    } catch (err) {
      setError('予期しないエラーが発生しました')
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
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

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
              学年
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
              <option value="その他">その他</option>
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
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="6文字以上"
              required
              disabled={loading}
              minLength={6}
            />
            <p className={styles.hint}>6文字以上で入力してください</p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>
              パスワード（確認）
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              placeholder="パスワードを再入力"
              required
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
