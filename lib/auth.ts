import { getUsersCollection, UserRole, UserProfile } from './db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface LoginResult {
  success: boolean
  user?: Omit<UserProfile, 'password'>
  token?: string
  error?: string
}

export interface RegisterResult {
  success: boolean
  user?: Omit<UserProfile, 'password'>
  token?: string
  error?: string
}

// JWTトークンを生成
function generateToken(userId: string, email: string, role: UserRole): string {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// トークンを検証
export function verifyToken(token: string): { userId: string; email: string; role: UserRole } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: UserRole }
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * メールアドレスでログイン
 * ロールを自動判別し、無効アカウント/退会者をブロック
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const usersCollection = await getUsersCollection()

    // ユーザーを検索
    const user = await usersCollection.findOne({ email: email.toLowerCase() })

    if (!user) {
      return {
        success: false,
        error: 'メールアドレスまたはパスワードが正しくありません',
      }
    }

    // 無効アカウントまたは退会者のチェック
    if (!user.is_active || user.is_deleted) {
      return {
        success: false,
        error: 'このアカウントは無効化されているか、退会済みです',
      }
    }

    // パスワードの検証
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return {
        success: false,
        error: 'メールアドレスまたはパスワードが正しくありません',
      }
    }

    // トークンを生成
    const token = generateToken(user.id, user.email, user.role)

    // パスワードを除外してユーザー情報を返す
    const { password: _, ...userWithoutPassword } = user

    return {
      success: true,
      user: userWithoutPassword,
      token,
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      error: '予期しないエラーが発生しました',
    }
  }
}

/**
 * ユーザー登録
 * 既定でメンバー（member）として登録
 */
export async function registerWithEmail(
  email: string,
  password: string
): Promise<RegisterResult> {
  try {
    const usersCollection = await getUsersCollection()

    // 既存ユーザーのチェック
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() })

    if (existingUser) {
      return {
        success: false,
        error: 'このメールアドレスは既に登録されています',
      }
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10)

    // ユーザーIDを生成
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 新しいユーザーを作成
    const newUser: UserProfile = {
      id: userId,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'member',
      is_active: true,
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
    }

    // データベースに保存
    await usersCollection.insertOne(newUser)

    // トークンを生成
    const token = generateToken(newUser.id, newUser.email, newUser.role)

    // パスワードを除外してユーザー情報を返す
    const { password: _, ...userWithoutPassword } = newUser

    return {
      success: true,
      user: userWithoutPassword,
      token,
    }
  } catch (error) {
    console.error('Register error:', error)
    return {
      success: false,
      error: '予期しないエラーが発生しました',
    }
  }
}

/**
 * 現在のユーザー情報を取得
 */
export async function getCurrentUser(token: string): Promise<Omit<UserProfile, 'password'> | null> {
  try {
    const decoded = verifyToken(token)
    if (!decoded) {
      return null
    }

    const usersCollection = await getUsersCollection()
    const user = await usersCollection.findOne({ id: decoded.userId })

    if (!user || !user.is_active || user.is_deleted) {
      return null
    }

    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

/**
 * ユーザー情報をIDで取得
 */
export async function getUserById(userId: string): Promise<Omit<UserProfile, 'password'> | null> {
  try {
    const usersCollection = await getUsersCollection()
    const user = await usersCollection.findOne({ id: userId })

    if (!user || !user.is_active || user.is_deleted) {
      return null
    }

    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  } catch (error) {
    console.error('Get user by id error:', error)
    return null
  }
}
