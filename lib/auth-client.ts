// クライアントサイド用の認証関数

export interface LoginResult {
  success: boolean
  user?: {
    id: string
    email: string
    role: 'member' | 'admin'
    is_active: boolean
    is_deleted: boolean
  }
  error?: string
}

export interface RegisterResult {
  success: boolean
  user?: {
    id: string
    email: string
    role: 'member' | 'admin'
    is_active: boolean
    is_deleted: boolean
  }
  error?: string
}

/**
 * メールアドレスでログイン
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'ログインに失敗しました',
      }
    }

    return {
      success: true,
      user: data.user,
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      error: 'サーバーに接続できませんでした',
    }
  }
}

/**
 * 会員登録
 */
export async function registerWithEmail(
  email: string,
  password: string,
  name: string,
  grade: string
): Promise<RegisterResult> {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name, grade }),
    })

    const data = await response.json()

    if (!data.success) {
      return {
        success: false,
        error: data.error || '登録に失敗しました',
      }
    }

    return {
      success: true,
      user: data.user,
    }
  } catch (error) {
    console.error('Register error:', error)
    return {
      success: false,
      error: 'サーバーに接続できませんでした',
    }
  }
}

/**
 * ログアウト
 */
export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
    })
  } catch (error) {
    console.error('Logout error:', error)
  }
}

/**
 * 現在のユーザー情報を取得
 */
export async function getCurrentUser(): Promise<{
  id: string
  email: string
  role: 'member' | 'admin'
  is_active: boolean
  is_deleted: boolean
} | null> {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (!data.success || !data.user) {
      return null
    }

    return data.user
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}
