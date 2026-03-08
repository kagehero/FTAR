import { MongoClient, Db, Collection } from 'mongodb'
import type {
  Member,
  Class,
  Category,
  ClassDate,
  Attendance,
  TransferTicket,
  Waitlist,
  Announcement,
  NotificationLog,
} from './models'

// MongoDB接続のシングルトンパターン
let client: MongoClient | null = null
let db: Db | null = null

const MONGODB_URI = process.env.MONGODB_URI || ''
const MONGODB_DB = process.env.MONGODB_DB || 'ftar'

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db
  }

  console.log('MONGODB_URI', MONGODB_URI)
  console.log('MONGODB_DB', MONGODB_DB)

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

// コレクション取得関数
export async function getMembersCollection(): Promise<Collection<Member>> {
  const database = await connectToDatabase()
  return database.collection<Member>('members')
}

export async function getClassesCollection(): Promise<Collection<Class>> {
  const database = await connectToDatabase()
  return database.collection<Class>('classes')
}

export async function getCategoriesCollection(): Promise<Collection<Category>> {
  const database = await connectToDatabase()
  return database.collection<Category>('categories')
}

export async function getClassDatesCollection(): Promise<Collection<ClassDate>> {
  const database = await connectToDatabase()
  return database.collection<ClassDate>('class_dates')
}

export async function getAttendancesCollection(): Promise<Collection<Attendance>> {
  const database = await connectToDatabase()
  return database.collection<Attendance>('attendances')
}

export async function getTransferTicketsCollection(): Promise<Collection<TransferTicket>> {
  const database = await connectToDatabase()
  return database.collection<TransferTicket>('transfer_tickets')
}

export async function getWaitlistsCollection(): Promise<Collection<Waitlist>> {
  const database = await connectToDatabase()
  return database.collection<Waitlist>('waitlists')
}

export async function getAnnouncementsCollection(): Promise<Collection<Announcement>> {
  const database = await connectToDatabase()
  return database.collection<Announcement>('announcements')
}

export async function getNotificationLogsCollection(): Promise<Collection<NotificationLog>> {
  const database = await connectToDatabase()
  return database.collection<NotificationLog>('notification_logs')
}

// データベース接続を閉じる
export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}

// インデックス作成（初回セットアップ時）
export async function createIndexes(): Promise<void> {
  const members = await getMembersCollection()
  const classes = await getClassesCollection()
  const classDates = await getClassDatesCollection()
  const attendances = await getAttendancesCollection()
  const tickets = await getTransferTicketsCollection()
  const waitlists = await getWaitlistsCollection()

  // メンバー
  await members.createIndex({ email: 1 }, { unique: true })
  await members.createIndex({ id: 1 }, { unique: true })

  // クラス
  await classes.createIndex({ id: 1 }, { unique: true })

  // 開催日
  await classDates.createIndex({ class_id: 1, date: 1 })
  await classDates.createIndex({ id: 1 }, { unique: true })

  // 出欠
  await attendances.createIndex({ member_id: 1, class_date_id: 1 }, { unique: true })
  await attendances.createIndex({ class_date_id: 1 })

  // 振替チケット
  await tickets.createIndex({ member_id: 1 })
  await tickets.createIndex({ id: 1 }, { unique: true })
  await tickets.createIndex({ expires_at: 1 })

  // キャンセル待ち
  await waitlists.createIndex({ member_id: 1, class_date_id: 1 }, { unique: true })
  await waitlists.createIndex({ class_date_id: 1, position: 1 })
  await waitlists.createIndex({ ticket_id: 1 })
}
