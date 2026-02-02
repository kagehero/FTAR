import { MongoClient, Db, Collection } from 'mongodb'

// ユーザータイプ定義
export type UserRole = 'member' | 'admin'

export interface UserProfile {
  _id?: string
  id: string
  email: string
  password: string // ハッシュ化されたパスワード
  role: UserRole
  is_active: boolean
  is_deleted: boolean
  created_at: Date
  updated_at: Date
}

// MongoDB接続のシングルトンパターン
let client: MongoClient | null = null
let db: Db | null = null

const MONGODB_URI = process.env.MONGODB_URI || ''
const MONGODB_DB = process.env.MONGODB_DB || 'ftar'

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI環境変数が設定されていません')
  }

  try {
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    db = client.db(MONGODB_DB)
    console.log('✅ MongoDB接続成功')
    return db
  } catch (error) {
    console.error('❌ MongoDB接続エラー:', error)
    throw error
  }
}

export async function getUsersCollection(): Promise<Collection<UserProfile>> {
  const database = await connectToDatabase()
  return database.collection<UserProfile>('users')
}

// データベース接続を閉じる
export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}
