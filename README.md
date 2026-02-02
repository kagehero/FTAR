# FTAR - ログインシステム

Next.jsとMongoDBを使用したログインシステムです。

## 機能

- メールアドレスによるログイン
- ユーザー登録（既定でメンバーとして登録）
- ロール自動判別（会員 / 管理者）
- ロール別リダイレクト
  - 会員 → 会員ホーム
  - 管理者 → 管理ダッシュボード
- 無効アカウント / 退会者ブロック
- JWTベースの認証

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. MongoDBの設定

#### ローカルMongoDBを使用する場合

1. [MongoDB Community Server](https://www.mongodb.com/try/download/community)をインストール
2. MongoDBを起動

#### MongoDB Atlasを使用する場合

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)でアカウントを作成
2. クラスターを作成
3. データベースユーザーを作成
4. 接続文字列を取得

### 3. 環境変数の設定

プロジェクトルートに`.env.local`ファイルを作成し、以下の内容を設定：

```env
# MongoDB接続文字列
MONGODB_URI=mongodb://localhost:27017
# または MongoDB Atlas の場合:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/

# データベース名
MONGODB_DB=ftar

# JWT秘密鍵（本番環境では強力なランダム文字列に変更してください）
JWT_SECRET=your-secret-key-change-in-production
```

**重要**: `.env.local`ファイルは`.gitignore`に含まれているため、Gitにはコミットされません。

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## プロジェクト構造

```
├── app/
│   ├── api/
│   │   └── auth/          # 認証APIルート
│   │       ├── login/     # ログイン
│   │       ├── register/  # 登録
│   │       ├── logout/    # ログアウト
│   │       └── me/        # 現在のユーザー情報取得
│   ├── admin/
│   │   └── dashboard/     # 管理ダッシュボード
│   ├── member/
│   │   └── home/          # 会員ホーム
│   ├── register/          # 登録ページ
│   ├── globals.css        # グローバルスタイル
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx           # ログインページ
├── lib/
│   ├── auth.ts            # サーバーサイド認証ロジック
│   ├── auth-client.ts    # クライアントサイド認証関数
│   └── db.ts              # MongoDB接続
├── middleware.ts          # 認証ミドルウェア
└── package.json
```

## 使用方法

1. 登録ページ（`/register`）で新規アカウントを作成
2. ログインページ（`/`）でメールアドレスとパスワードを入力
3. ロールに応じて自動的にリダイレクトされます

## データベーススキーマ

### users コレクション

```typescript
{
  id: string              // ユーザーID
  email: string           // メールアドレス（小文字、一意）
  password: string        // ハッシュ化されたパスワード
  role: 'member' | 'admin' // ロール
  is_active: boolean      // アクティブ状態
  is_deleted: boolean     // 削除フラグ
  created_at: Date        // 作成日時
  updated_at: Date        // 更新日時
}
```

## 注意事項

- 管理者ロールのユーザーを作成する場合は、MongoDBで直接`role`を`'admin'`に設定してください
- アカウントを無効化する場合は、`is_active`を`false`に設定
- 退会処理を行う場合は、`is_deleted`を`true`に設定
- 本番環境では、`JWT_SECRET`を強力なランダム文字列に変更してください

## セキュリティ

- パスワードはbcryptでハッシュ化されています
- JWTトークンはHTTP-only Cookieに保存されます
- トークンの有効期限は7日間です