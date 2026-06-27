# AI Review Dashboard

AI に Pull Request のコードレビューを実行させ、生成された複数の指摘から **価値あるものだけを取捨選択** して、選んだものだけを GitHub PR にインラインレビューコメントとして反映するためのローカル Web アプリケーションです。

レビュアー（シニアエンジニア）が自分のローカル環境で起動し、ローカルの **Claude Code 認証**と **`gh` CLI 認証**をそのまま再利用します（API キーの別途設定は不要）。

## 特徴

- 🔍 GitHub のリポジトリ / オープン PR を一覧表示（検索・絞り込み）
- ✨ ボタン 1 つで AI（Claude）が PR をレビューし、構造化された指摘を生成
- 🎯 指摘を対象コード付きで一覧表示し、チェックで取捨選択
- 💬 選んだ指摘だけを GitHub のインラインレビューコメントとして一括投稿
- ⚙️ レビュー観点（プロンプト）とモデルをローカルで自由に調整
- 🌙 ダークテーマのシンプルでスタイリッシュなダッシュボード

## 前提条件

| 必要なもの | 確認方法 |
|------------|----------|
| Node.js 20+ | `node -v` |
| GitHub CLI (`gh`) と認証 | `gh auth status`（未ログインなら `gh auth login`） |
| Claude Code の認証 | ローカルの `~/.claude` 認証を SDK が自動再利用します |

> レビュー実行時、対象リポジトリのコードが Claude に渡されます。社内ポリシー等に留意してください。

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで <http://localhost:3000> を開きます。

## 使い方

1. **リポジトリを選ぶ** — トップ画面でレビュー対象のリポジトリを選択。
2. **PR を選ぶ** — オープンな PR 一覧から対象を選択。
3. **レビュー実行** — 「レビュー実行」を押すと、PR を一時 checkout して AI がレビューを生成します（進捗が表示されます）。
4. **取捨選択** — 生成された指摘をチェック（全選択 / 全解除あり）。diff 範囲外で投稿できない指摘は警告表示されます。
5. **PR に反映** — 「選択した N 件を PR に反映」で、GitHub のインラインレビューコメントとして一括投稿します。
6. **設定** — サイドバーの「設定」でレビュープロンプトとモデルを編集・保存できます（次回レビューに反映）。

## スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー起動 |
| `npm run lint` | ESLint |
| `npm run format` | Prettier 整形 |
| `npm run typecheck` | 型チェック |

## 技術スタック

- **Next.js 15**（App Router）/ TypeScript / React 19
- **Tailwind CSS v4** + shadcn/ui スタイルのコンポーネント / lucide-react
- **TanStack Query**（クライアントデータ取得）
- **@anthropic-ai/claude-agent-sdk**（Claude Code 認証を再利用したレビュー実行）
- **zod**（AI 出力の構造化検証）
- **shiki**（コードスニペットのシンタックスハイライト）
- GitHub 連携は `gh` CLI を `child_process` 経由で利用（トークンは保存せず都度取得）

## データの保存先

- `~/.config/ai-review-dashboard/settings.json` … レビュープロンプト・モデル設定
- `~/.config/ai-review-dashboard/sessions/<id>.json` … レビュー実行履歴

## ディレクトリ構成

```
src/
├─ app/
│  ├─ (dashboard)/            # 画面（リポジトリ / PR / レビュー / 設定）
│  └─ api/                    # Route Handlers
├─ components/
│  ├─ ui/                     # shadcn/ui スタイルのプリミティブ
│  └─ app/                    # 画面固有コンポーネント
└─ lib/
   ├─ github/                 # gh CLI ラッパー・diff 解析・レビュー投稿
   ├─ review/                 # Agent SDK 連携・プロンプト・JSON 抽出
   ├─ settings/               # 設定・セッションのファイル I/O
   ├─ schema/                 # zod スキーマ・型
   └─ client/                 # クライアント側 API / ユーティリティ
```

## 設計ドキュメント

詳細は [`docs/development-design.md`](./docs/development-design.md) を参照してください。
