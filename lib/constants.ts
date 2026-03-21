// クラス・会員共通の対象学年（キッズ〜6年）
export const GRADE_OPTIONS = ['キッズ', '1年', '2年', '3年', '4年', '5年', '6年'] as const

// カテゴリ（クラス形態）別対象学年（出欠名簿の会員マッチング用）
export const GRADE_BY_CATEGORY: Record<string, string[]> = {
  キッズ: ['年少・年中・年長', '年少', '年中', '年長', 'キッズ'],
  通常: ['U8', 'U10', 'U12'],
  スーパー強化: ['S', 'A'],
  特化: ['基礎特化', 'DF特化', 'キック特化', 'ドリブル特化'],
  特待: ['特待'],
  その他: [],
}

// 振替可否ルール（MVP: シンプルルールベース）
// 特待→全クラスOK、特化→強化NG、同一カテゴリ内→OK
export const TRANSFER_CATEGORY_RULES: Record<string, string[]> = {
  特待: ['キッズ', '通常', 'スーパー強化', '特化', '特待', 'その他'], // 全OK
  特化: ['キッズ', '通常', '特化', 'その他'], // 強化NG
  スーパー強化: ['キッズ', '通常', 'スーパー強化', '特待', 'その他'],
  通常: ['キッズ', '通常', 'スーパー強化', '特待', 'その他'],
  キッズ: ['キッズ', '通常', '特待', 'その他'],
  その他: ['キッズ', '通常', 'スーパー強化', '特化', '特待', 'その他'],
}

export const TRANSFER_LIMIT_PER_MONTH = 1
export const TRANSFER_DEADLINE_MONTHS = 2
export const ABSENCE_DEADLINE_HOURS = 1
export const TRANSFER_DEADLINE_HOURS = 1

// 対象学年（キッズ〜6年）→ 会員のgradeにマッチする値
export const TARGET_GRADE_TO_MEMBER_GRADES: Record<string, string[]> = {
  キッズ: ['年少・年中・年長', '年少', '年中', '年長', 'キッズ'],
  '1年': ['1年', '1年スーパー'],
  '2年': ['2年', '2年スーパー'],
  '3年': ['3年', '3年A', '3年S', '特大'],
  '4年': ['4年', '4年A', '4年S', '特大'],
  '5年': ['5年', '5年A', '5年S', '特大'],
  '6年': ['6年', '6年A', '6年S', '特待'],
}
