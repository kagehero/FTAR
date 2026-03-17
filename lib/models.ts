// データベースモデル定義

export type UserRole = 'member' | 'admin'
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'holiday'
export type AttendanceStatus = 'unregistered' | 'attending' | 'absent' | 'waiting'
export type TicketStatus = 'unused' | 'used' | 'expired'
export type WaitlistStatus = 'waiting' | 'confirmed' | 'expired'
export type MemberStatus = 'active' | 'suspended' | 'withdrawn'

// 会員
export interface Member {
  _id?: string
  id: string
  email: string
  password: string
  name: string
  grade: string // 学年
  phone?: string
  // 参加クラス（クラスIDの配列）
  // これが設定されている場合、出欠名簿は基本的にこの参加クラスを基準に表示する
  enrolled_class_ids?: string[]
  role: UserRole
  status: MemberStatus
  is_active: boolean
  is_deleted: boolean
  created_at: Date
  updated_at: Date
}

// カテゴリ（クラス形態のマスタ）
export interface Category {
  _id?: string
  id: string
  name: string
  sort_order?: number
  created_at: Date
  updated_at: Date
}

// クラス
export interface Class {
  _id?: string
  id: string
  name: string
  day_of_week: number // 0-6 (日-土)
  start_time: string // HH:mm形式
  end_time: string // HH:mm形式
  grade: string // 対象学年
  category: string // カテゴリ（初心者/上級など）
  capacity: number // 定員
  venue: string // 会場
  allow_transfer: boolean // 振替可否
  is_active: boolean
  created_at: Date
  updated_at: Date
}

// 開催日（class_sessions）
export interface ClassDate {
  _id?: string
  id: string
  class_id: string
  date: Date // 開催日
  is_cancelled: boolean // 中止フラグ（後方互換）
  cancelled_reason?: string
  auto_transfer_ticket: boolean
  session_status?: SessionStatus // scheduled=予定, completed=開催済, cancelled=雨天中止, holiday=休み
  note?: string // 雨天中止時の理由など
  created_at: Date
  updated_at: Date
}

// 出欠（attendance roster）
export interface Attendance {
  _id?: string
  id: string
  member_id: string
  class_date_id: string
  status: AttendanceStatus // attending=出席, absent=欠席, waiting=待ち
  registered_at: Date
  changed_by?: string
  notes?: string
  checkin_time?: Date // チェックイン日時
  created_at: Date
  updated_at: Date
}

// 振替チケット
export interface TransferTicket {
  _id?: string
  id: string
  member_id: string
  class_date_id: string // 欠席したクラス
  issued_at: Date // 発行日
  expires_at: Date // 有効期限
  status: TicketStatus
  used_class_date_id?: string // 使用したクラス
  used_at?: Date
  created_at: Date
  updated_at: Date
}

// キャンセル待ち
export interface Waitlist {
  _id?: string
  id: string
  member_id: string
  ticket_id?: string
  class_date_id: string
  position: number // 順番
  status: WaitlistStatus
  confirmed_at?: Date
  expired_at?: Date
  created_at: Date
  updated_at: Date
}

// お知らせ
export interface Announcement {
  _id?: string
  id: string
  title: string
  content: string
  target_audience: 'all' | 'members' | 'admins'
  target_classes?: string[] // 特定クラスのみ
  is_active: boolean
  created_by: string // 作成者ID
  created_at: Date
  updated_at: Date
}

// 通知ログ
export interface NotificationLog {
  _id?: string
  id: string
  member_id: string
  type: 'email' | 'line'
  subject?: string
  content: string
  sent_at: Date
  status: 'sent' | 'failed'
  error_message?: string
}
