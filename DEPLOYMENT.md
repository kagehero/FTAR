# Vercel デプロイ手順

このドキュメントでは、FTAR プロジェクトを Vercel にデプロイする手順を説明します。

## 前提条件

- GitHub アカウント
- Vercel アカウント（[vercel.com](https://vercel.com) で無料登録可能）
- MongoDB Atlas アカウント（または MongoDB インスタンス）

## デプロイ手順

### 1. GitHub にコードをプッシュ

プロジェクトが GitHub リポジトリにプッシュされていることを確認してください。

```bash
# 既存のリポジトリがある場合
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main  # または master, dev など

# 新しいリポジトリを作成する場合
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/FTAR.git
git push -u origin main
```

### 2. Vercel でプロジェクトをインポート

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. 「Add New...」→「Project」をクリック
3. 「Import Git Repository」から GitHub リポジトリを選択
4. プロジェクトを選択して「Import」をクリック

### 3. プロジェクト設定

Vercel が自動的に Next.js を検出します。以下の設定を確認してください：

- **Framework Preset**: Next.js
- **Root Directory**: `./` (デフォルト)
- **Build Command**: `npm run build` (自動検出)
- **Output Directory**: `.next` (自動検出)
- **Install Command**: `npm install` (自動検出)

### 4. 環境変数の設定

**重要**: デプロイ前に必ず環境変数を設定してください。

1. プロジェクト設定画面で「Environment Variables」セクションを開く
2. 以下の環境変数を追加：

| 変数名 | 値の例 | 説明 |
|--------|--------|------|
| `MONGODB_URI` | `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority` | MongoDB 接続文字列 |
| `MONGODB_DB` | `ftar` | データベース名 |
| `JWT_SECRET` | `your-very-long-random-secret-key-here` | JWT トークンの秘密鍵（長いランダム文字列） |

**環境変数の適用先**:
- ✅ **Production** (本番環境)
- ✅ **Preview** (プレビュー環境)
- ✅ **Development** (開発環境)

**注意事項**:
- `MONGODB_URI` のパスワードに特殊文字（`@`, `/`, `:`, `?`, `#` など）が含まれる場合は、URL エンコードが必要です
  - 例: `@` → `%40`, `/` → `%2F`, `:` → `%3A`
- `JWT_SECRET` は本番環境では必ず強力なランダム文字列に変更してください
  - 生成方法: `openssl rand -base64 32` またはオンラインツールを使用

### 5. デプロイの実行

1. 「Deploy」ボタンをクリック
2. ビルドログを確認（通常 2-5 分程度）
3. デプロイが完了すると、URL が表示されます（例: `https://ftar.vercel.app`）

### 6. デプロイ後の確認

1. **ビルドログの確認**
   - 「Deployments」タブ → 最新デプロイ → 「Build Logs」を確認
   - `✓ Compiled successfully` が表示されていることを確認
   - エラーがないことを確認

2. **アプリケーションの動作確認**
   - デプロイされた URL にアクセス
   - ログインページが表示されることを確認
   - 新規登録ができることを確認
   - ログインができることを確認

3. **Runtime Logs の確認**
   - 「Logs」タブ → 「Runtime Logs」を確認
   - `✅ MongoDB接続成功` が表示されていることを確認
   - エラーがないことを確認

## トラブルシューティング

### ビルドエラーが発生する場合

1. **TypeScript エラー**
   - ローカルで `npm run build` を実行してエラーを確認
   - エラーを修正してから再デプロイ

2. **依存関係のエラー**
   - `package.json` の依存関係を確認
   - `node_modules` を削除して `npm install` を再実行

### ランタイムエラーが発生する場合

1. **MongoDB 接続エラー**
   - 環境変数 `MONGODB_URI` が正しく設定されているか確認
   - MongoDB Atlas の IP アドレスホワイトリストに Vercel の IP を追加（必要に応じて）
   - MongoDB Atlas の接続文字列が正しいか確認

2. **401 Unauthorized エラー**
   - 環境変数 `JWT_SECRET` が設定されているか確認
   - ユーザーがデータベースに存在するか確認

3. **環境変数が反映されない**
   - 環境変数を追加・変更した後、必ず再デプロイを実行
   - Production / Preview / Development の適用先を確認

### 再デプロイ方法

1. **手動再デプロイ**
   - 「Deployments」タブ → 最新デプロイの「...」メニュー → 「Redeploy」

2. **Git プッシュで自動デプロイ**
   - 新しいコミットを GitHub にプッシュすると自動的に再デプロイされます

## カスタムドメインの設定（オプション）

1. プロジェクト設定 → 「Domains」を開く
2. カスタムドメインを入力
3. DNS 設定に従ってドメインを設定

## 継続的デプロイ（CI/CD）

Vercel は GitHub と連携して自動デプロイを行います：

- **main/master ブランチ**: Production 環境に自動デプロイ
- **その他のブランチ**: Preview 環境に自動デプロイ
- **Pull Request**: プレビュー URL が自動生成

## 環境変数の管理

### 本番環境と開発環境で異なる値を設定する場合

1. 環境変数を追加する際、「Environment」で適用先を選択
2. Production / Preview / Development で異なる値を設定可能

### 環境変数の更新

1. 「Settings」→「Environment Variables」で編集
2. 変更後、再デプロイが必要

## パフォーマンス最適化

Vercel は自動的に以下を最適化します：

- 自動的な CDN 配信
- 画像の最適化
- コードの分割と遅延読み込み
- Edge Functions の利用

## 参考リンク

- [Vercel ドキュメント](https://vercel.com/docs)
- [Next.js デプロイガイド](https://nextjs.org/docs/deployment)
- [MongoDB Atlas ドキュメント](https://docs.atlas.mongodb.com/)

## サポート

問題が解決しない場合は、以下を確認してください：

1. Vercel のビルドログとランタイムログ
2. MongoDB Atlas の接続ログ
3. ブラウザの開発者ツールのコンソールエラー
