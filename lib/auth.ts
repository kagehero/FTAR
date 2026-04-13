import { getMembersCollection, getParentsCollection } from './db'
import type { Member, Parent, UserRole } from './models'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/** 保護者あたりのお子様登録上限（要件の4〜5名に合わせる） */
export const MAX_CHILDREN_PER_PARENT = 5

export function generateRandomPassword(length: number = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * chars.length)
    result += chars[idx]
  }
  return result
}

export interface JwtPayload {
  userId: string
  email: string
  role: UserRole
  parentId?: string
}

export interface LoginResult {
  success: boolean
  user?: Omit<Member, 'password'>
  token?: string
  error?: string
}

export interface RegisterResult {
  success: boolean
  user?: Omit<Member, 'password'> & { email?: string }
  token?: string
  error?: string
}

function generateToken(userId: string, email: string, role: UserRole, parentId?: string): string {
  const payload: Record<string, string> = { userId, email, role }
  if (parentId) payload.parentId = parentId
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    return decoded
  } catch {
    return null
  }
}

function isLegacyMemberDoc(m: Member): boolean {
  return !m.parent_id && !!m.email
}

export async function loginWithEmail(email: string, password: string): Promise<LoginResult> {
  try {
    const em = email.toLowerCase()
    const parentsCollection = await getParentsCollection()
    const membersCollection = await getMembersCollection()

    const parent = await parentsCollection.findOne({ email: em })
    if (parent) {
      const ok = await bcrypt.compare(password, parent.password)
      if (!ok) {
        return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' }
      }
      const children = await membersCollection
        .find({ parent_id: parent.id, is_deleted: false })
        .sort({ created_at: 1 })
        .toArray()
      const active = children.find((c) => c.is_active && c.status === 'active') ?? children[0]
      if (!active) {
        return { success: false, error: 'このアカウントに紐づく会員情報が見つかりません' }
      }
      const token = generateToken(active.id, parent.email, 'member', parent.id)
      const { password: _, ...rest } = active
      return {
        success: true,
        user: { ...rest, email: parent.email } as Omit<Member, 'password'>,
        token,
      }
    }

    const legacy = await membersCollection.findOne({ email: em })
    if (!legacy || !isLegacyMemberDoc(legacy)) {
      return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' }
    }
    if (!legacy.is_active || legacy.is_deleted) {
      return { success: false, error: 'このアカウントは無効化されているか、退会済みです' }
    }
    const isPasswordValid = await bcrypt.compare(password, legacy.password)
    if (!isPasswordValid) {
      return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' }
    }
    const token = generateToken(legacy.id, legacy.email!, legacy.role)
    const { password: __, ...userWithoutPassword } = legacy
    return { success: true, user: userWithoutPassword, token }
  } catch (error) {
    console.error('Login error:', error)
    const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました'
    if (
      errorMessage.includes('MongoDB') ||
      errorMessage.includes('MONGODB') ||
      errorMessage.includes('環境変数')
    ) {
      return {
        success: false,
        error: 'データベース接続エラーが発生しました。管理者にお問い合わせください。',
      }
    }
    return { success: false, error: '予期しないエラーが発生しました' }
  }
}

/**
 * 新規登録：保護者1件 + お子様1人目（メール1つでログイン、子は member に紐づけ）
 */
export async function registerParentAndFirstChild(
  email: string,
  password: string,
  name: string,
  grade: string
): Promise<RegisterResult> {
  try {
    const em = email.toLowerCase()
    const parentsCollection = await getParentsCollection()
    const membersCollection = await getMembersCollection()

    if (await parentsCollection.findOne({ email: em })) {
      return { success: false, error: 'このメールアドレスは既に登録されています' }
    }
    const legacyHit = await membersCollection.findOne({ email: em })
    if (legacyHit && isLegacyMemberDoc(legacyHit)) {
      return { success: false, error: 'このメールアドレスは既に登録されています' }
    }

    const rawPw = password.trim().length > 0 ? password : generateRandomPassword(10)
    const hashedParentPassword = await bcrypt.hash(rawPw, 10)

    const parentId = `parent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const parent: Parent = {
      id: parentId,
      email: em,
      password: hashedParentPassword,
      created_at: new Date(),
      updated_at: new Date(),
    }

    const childId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const childPasswordPlaceholder = await bcrypt.hash(generateRandomPassword(32), 10)
    const child: Member = {
      id: childId,
      parent_id: parentId,
      password: childPasswordPlaceholder,
      name,
      grade,
      role: 'member',
      status: 'active',
      is_active: true,
      is_deleted: false,
      enrolled_class_ids: [],
      created_at: new Date(),
      updated_at: new Date(),
    }

    await parentsCollection.insertOne(parent)
    await membersCollection.insertOne(child)

    const token = generateToken(childId, em, 'member', parentId)
    const { password: _, ...cOut } = child
    return {
      success: true,
      user: { ...cOut, email: em },
      token,
    }
  } catch (error) {
    console.error('Register error:', error)
    return { success: false, error: '予期しないエラーが発生しました' }
  }
}

/** @deprecated 単一会員登録。新規は registerParentAndFirstChild を使用 */
export async function registerWithEmail(
  email: string,
  password: string,
  name: string,
  grade: string
): Promise<RegisterResult> {
  return registerParentAndFirstChild(email, password, name, grade)
}

export async function addChildForParent(
  parentId: string,
  name: string,
  grade: string
): Promise<{ success: boolean; member?: Member; error?: string }> {
  const membersCollection = await getMembersCollection()
  const count = await membersCollection.countDocuments({ parent_id: parentId, is_deleted: false })
  if (count >= MAX_CHILDREN_PER_PARENT) {
    return { success: false, error: `お子様は最大${MAX_CHILDREN_PER_PARENT}人まで登録できます` }
  }
  const childId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const childPasswordPlaceholder = await bcrypt.hash(generateRandomPassword(32), 10)
  const child: Member = {
    id: childId,
    parent_id: parentId,
    password: childPasswordPlaceholder,
    name,
    grade,
    role: 'member',
    status: 'active',
    is_active: true,
    is_deleted: false,
    enrolled_class_ids: [],
    created_at: new Date(),
    updated_at: new Date(),
  }
  await membersCollection.insertOne(child)
  return { success: true, member: child }
}

export function reissueTokenForChild(
  parentEmail: string,
  parentId: string,
  childMemberId: string
): string {
  return generateToken(childMemberId, parentEmail, 'member', parentId)
}

export async function getCurrentUser(token: string): Promise<(Omit<Member, 'password'> & { email?: string }) | null> {
  try {
    const decoded = verifyToken(token)
    if (!decoded) return null

    const membersCollection = await getMembersCollection()
    const user = await membersCollection.findOne({ id: decoded.userId })

    if (!user || !user.is_active || user.is_deleted) return null

    const { password: _, ...rest } = user
    const displayEmail = rest.email ?? decoded.email
    return { ...rest, email: displayEmail }
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

export async function getMemberById(userId: string): Promise<Omit<Member, 'password'> | null> {
  try {
    const membersCollection = await getMembersCollection()
    const user = await membersCollection.findOne({ id: userId })

    if (!user || !user.is_active || user.is_deleted) return null

    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  } catch (error) {
    console.error('Get user by id error:', error)
    return null
  }
}

export async function listChildrenForParent(parentId: string): Promise<Omit<Member, 'password'>[]> {
  const membersCollection = await getMembersCollection()
  const rows = await membersCollection
    .find({ parent_id: parentId, is_deleted: false })
    .sort({ created_at: 1 })
    .toArray()
  return rows.map(({ password: _, ...m }) => m)
}
