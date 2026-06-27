# AI Review Dashboard 開発設計書

> 本ドキュメントは AI エージェントが本アプリケーションを実装できるように、要件・アーキテクチャ・データモデル・API・実装タスクを定義したものです。
> 元となる要件は [`docs/note.md`](./note.md) を参照してください。

---

## 1. プロダクト概要

### 1.1 目的
AI に Pull Request のコードレビューを実行させ、生成された複数のレビュー指摘から **ユーザーが価値あるものだけを取捨選択** し、選んだものだけを GitHub PR にインラインレビューコメントとして反映するためのローカル Web アプリケーション。

### 1.2 解決したい課題
- AI レビューは便利だが、不要・的外れな指摘も生成される。
- ジュニアの PR を AI がレビューしても、レビュイー自身は指摘の良し悪しを判断できない。
- 結局シニアが細かくレビューする必要があり負担が大きい。
- → **シニアが「AI 指摘を選ぶだけ」で良い状態** を作り、レビュー工程を半自動化する。

### 1.3 想定ユーザー / 利用シーン
- レビュアー（シニアエンジニア）が自分のローカル環境でアプリを起動。
- ローカルの Claude Code 認証・`gh` 認証をそのまま再利用する。
- 1 人のレビュアーがローカルで使うシングルユーザー前提（マルチテナント・共有サーバーは対象外）。

---

## 2. 確定した技術方針（意思決定ログ）

| 項目 | 決定 | 理由 |
|------|------|------|
| 提供形態 | **ローカル Web アプリ** | サーバー側プロセスから SDK / gh を呼べて実装がシンプル。ブラウザで開く。 |
| AI 連携 | **Claude Agent SDK + Claude Code CLI 認証の再利用** | ローカルの Claude Code 認証（`~/.claude/auth.json`）をそのまま利用。API キー管理不要。 |
| GitHub 認証 | **`gh` CLI の認証を再利用** | 既存の `gh auth login` を流用。OAuth App 登録不要で最速。トークンは `gh auth token` で取得。 |
| PR 反映形式 | **行単位のインラインレビューコメント** | 対象コードの該当行に紐付く。レビュー本来の体験に近い。 |

> 上記は確定事項。実装中に技術的制約で変更が必要な場合は本表を更新すること。

---

## 3. 技術スタック

| レイヤー | 採用技術 |
|----------|----------|
| フレームワーク | **Next.js 15（App Router）** / TypeScript |
| 実行環境 | Node.js 20+（確認済み: v24 / `gh` 2.80） |
| UI | React 19 + **Tailwind CSS** + **shadcn/ui** |
| アイコン | lucide-react |
| 状態管理 | サーバー: Route Handlers / Server Actions、クライアント: TanStack Query（or SWR） |
| AI 連携 | **`@anthropic-ai/claude-agent-sdk`** |
| GitHub 連携 | `gh` CLI（`child_process`）+ 必要に応じ `@octokit/rest`（トークンは `gh auth token`） |
| バリデーション | **zod**（AI 出力の構造化検証に必須） |
| ローカル永続化 | ファイル（`~/.config/ai-review-dashboard/` 配下に JSON） |
| デザイン | ダークテーマのダッシュボード。シンプル / スタイリッシュ。 |

> UI 実装時は `ui-ux-pro-max` スキルの活用を推奨（ダークテーマ・ダッシュボードの設計支援）。

---

## 4. システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (React / shadcn UI, ダークテーマ)                     │
│   - リポジトリ / PR 一覧                                       │
│   - レビュー実行ボタン                                         │
│   - レビュー指摘の一覧 + 対象コード表示 + チェックボックス     │
│   - プロンプト編集画面                                         │
└───────────────▲─────────────────────────────────────────────┘
                │  fetch (REST / Server Actions)
┌───────────────┴─────────────────────────────────────────────┐
│ Next.js Server (Node.js, ローカル起動)                        │
│                                                              │
│  ┌────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │ GitHub層   │  │ Review Engine  │  │ Settings / Prompt  │  │
│  │ (gh/octokit)│ │ (Agent SDK)    │  │ Store (file)       │  │
│  └─────┬──────┘  └───────┬────────┘  └─────────┬──────────┘  │
└────────┼─────────────────┼─────────────────────┼─────────────┘
         │                 │                     │
   ┌─────▼─────┐     ┌─────▼──────┐        ┌─────▼─────┐
   │ GitHub API│     │ Claude     │        │ ローカル   │
   │ (gh auth) │     │ (Claude    │        │ ファイル   │
   │           │     │  Code 認証) │        │           │
   └───────────┘     └────────────┘        └───────────┘
```

### 4.1 レビュー実行のデータフロー
1. ユーザーが PR を選択し「レビュー実行」を押下。
2. サーバーが対象 PR を一時ディレクトリに checkout（`gh pr checkout` 相当）。
3. PR の diff（`gh pr diff`）とメタ情報、ユーザー設定のレビュープロンプトを組み立てる。
4. Claude Agent SDK の `query()` を `cwd = 一時リポジトリ`、`allowedTools: ["Read","Grep","Glob","Bash"]` で実行。Claude にリポジトリ全体のコンテキストを与えつつ diff を中心にレビューさせる。
5. **構造化 JSON**（後述の `ReviewItem[]`）でレビュー結果を受け取り、zod で検証。
6. レビュー結果を `ReviewSession` として保存し、クライアントへ返す。
7. ユーザーが指摘をチェックして「PR に反映」を押下。
8. サーバーが選択された指摘を GitHub のインラインレビューコメントとして投稿。

---

## 5. 主要機能と要件

### F-1. GitHub 認証（gh 再利用）
- アプリ起動時に `gh auth status` を実行し、ログイン状態とユーザー名を取得。
- 未ログイン時はその旨を UI に表示し、`gh auth login` の実行を促す（アプリからは実行しない）。
- GitHub API 呼び出し用トークンは `gh auth token` で都度取得（保存しない）。

### F-2. リポジトリ / PR 一覧
- ユーザーがアクセス可能なリポジトリを一覧表示（検索・絞り込み可）。
- リポジトリ選択でオープンな PR 一覧を表示（番号・タイトル・作者・更新日時・変更行数・ブランチ）。
- 一覧は `gh` または Octokit で取得。

### F-3. レビュー実行
- PR 詳細画面の「レビュー実行」ボタンで AI レビューを開始。
- 実行中はプログレス（checkout → 解析 → レビュー生成）を表示。
- 進捗は SDK のストリーミングメッセージを SSE 等でクライアントへ反映してもよい（任意）。

### F-4. レビュー結果の一覧表示
- 各指摘について以下を表示:
  - 対象ファイルパス・行範囲
  - **対象コードのスニペット**（該当行のハイライト付き）
  - 指摘本文（Markdown）
  - 重要度（`severity`: info / warning / critical）
  - カテゴリ（`category`: bug / performance / security / style / maintainability など）
- 各指摘にチェックボックス。全選択 / 全解除あり。

### F-5. PR への反映
- チェックした指摘のみを GitHub PR の **インラインレビューコメント** として投稿。
- 1 回の操作で 1 件の Review（`event: COMMENT`）にまとめて投稿。
- 行情報が diff に含まれない指摘は、投稿不可として UI で警告（PR 全体コメントへフォールバック可、任意）。
- 投稿成功後、各指摘に「反映済み」状態を付与。

### F-6. レビュープロンプトの調整
- レビュー観点・重視点をテキストで自由編集できる設定画面。
- 内容はローカルに永続化。デフォルトプロンプトを同梱。
- プロンプトはレビュー実行時にシステムプロンプト or ユーザープロンプトへ差し込む。

---

## 6. データモデル

```ts
// レビュー1指摘
interface ReviewItem {
  id: string;                 // uuid
  filePath: string;           // 例: "src/api/user.ts"
  startLine: number;          // diff の新ファイル側行番号
  endLine: number;
  side: "RIGHT" | "LEFT";     // GitHub のレビュー行サイド。通常 RIGHT
  severity: "info" | "warning" | "critical";
  category: string;           // bug / performance / security / style / maintainability ...
  title: string;              // 短い見出し
  body: string;               // 指摘本文（Markdown）
  codeSnippet: string;        // 対象コード抜粋（表示用）
  status: "pending" | "submitted" | "skipped";
}

// 1回のレビュー実行
interface ReviewSession {
  id: string;
  repo: string;               // "owner/name"
  prNumber: number;
  headSha: string;            // インラインコメント投稿に必須（commit_id）
  promptUsed: string;         // 実行時のプロンプト（再現性のため保存）
  model: string;              // 使用モデル
  items: ReviewItem[];
  createdAt: string;          // ISO8601
}

// ユーザー設定
interface AppSettings {
  reviewPrompt: string;       // F-6 のプロンプト
  model: string;              // 既定: "claude-opus-4-8"（alias "opus" 可）
}
```

### 永続化先
- `~/.config/ai-review-dashboard/settings.json` … `AppSettings`
- `~/.config/ai-review-dashboard/sessions/<sessionId>.json` … `ReviewSession`（履歴・任意）

---

## 7. AI レビュー連携の実装指針

### 7.1 query() 呼び出し例
```ts
import { query } from "@anthropic-ai/claude-agent-sdk";

const result = query({
  prompt: buildReviewPrompt(diff, userPrompt), // 下記参照
  options: {
    systemPrompt: { type: "preset", preset: "claude_code" },
    model: settings.model,            // 例: "claude-opus-4-8"
    cwd: checkoutDir,                 // checkout した一時リポジトリ
    allowedTools: ["Read", "Grep", "Glob", "Bash"],
    permissionMode: "bypassPermissions", // ローカル & 読み取り中心のため自動承認
  },
});

for await (const message of result) {
  // 進捗ストリーミング（任意でクライアントへ）
  // 最終アシスタントメッセージから JSON を抽出
}
```
- 認証: SDK はローカル Claude Code 認証（`~/.claude/auth.json`）を自動再利用するため追加設定不要。
- `permissionMode` は読み取り系ツール中心のローカル用途のため自動承認。書き込み・破壊的コマンドは行わせない方針（プロンプトで明示）。

### 7.2 構造化出力の取得
- LLM の出力は自由文になりがちなため、**「指定 JSON スキーマのみを出力せよ」** とプロンプトで強制し、出力を `zod` で検証する。
- 抽出失敗時は 1 回リトライ（「JSON のみを返せ」と再指示）。それでも失敗ならエラーを UI に表示。
- 推奨: 最終メッセージから ```json ブロックを抽出 → `JSON.parse` → `z.array(reviewItemSchema)` で検証。

### 7.3 プロンプト組み立て（buildReviewPrompt の責務）
- PR タイトル・説明・diff を含める。
- ユーザー設定の `reviewPrompt`（観点・重視点）を埋め込む。
- 出力フォーマット（`ReviewItem` の JSON 配列）と各フィールドの意味を明記。
- 行番号は **diff の新ファイル側（RIGHT）の行番号** を返すよう指示（インラインコメント投稿に必須）。
- 「価値の低い・重複・好み次第の指摘は出さない」など、ノイズ抑制の指示を含める。

---

## 8. GitHub 連携の実装指針

### 8.1 取得系
- リポジトリ一覧: `gh repo list --json ...` or Octokit。
- PR 一覧: `gh pr list --repo owner/name --json number,title,author,updatedAt,...`。
- PR diff: `gh pr diff <num> --repo owner/name`。
- head SHA: `gh pr view <num> --json headRefOid`。

### 8.2 checkout（レビュー用一時ディレクトリ）
- `os.tmpdir()` 配下に作業ディレクトリを作成し、対象 PR のブランチを取得。
- 終了後にクリーンアップ。同一 PR の再レビュー時はキャッシュ再利用も可（任意）。

### 8.3 インラインレビュー投稿
- GitHub REST: `POST /repos/{owner}/{repo}/pulls/{number}/reviews`
  ```json
  {
    "commit_id": "<headSha>",
    "event": "COMMENT",
    "comments": [
      { "path": "src/api/user.ts", "line": 42, "side": "RIGHT", "body": "..." }
    ]
  }
  ```
- 複数行指摘は `start_line` / `start_side` も付与可。
- トークンは `gh auth token`。Octokit か `gh api` で呼び出す。
- 投稿対象の行が PR の diff に含まれていない場合 API がエラーになるため、事前に diff 範囲と突き合わせて弾く / 警告する。

---

## 9. API 設計（Route Handlers）

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/auth/status` | gh ログイン状態・ユーザー名 |
| GET | `/api/repos` | アクセス可能なリポジトリ一覧 |
| GET | `/api/repos/{owner}/{repo}/pulls` | PR 一覧 |
| GET | `/api/repos/{owner}/{repo}/pulls/{number}` | PR 詳細（diff・headSha 含む） |
| POST | `/api/repos/{owner}/{repo}/pulls/{number}/review` | レビュー実行 → `ReviewSession` を返す（進捗は SSE 可） |
| POST | `/api/repos/{owner}/{repo}/pulls/{number}/comments` | 選択した `ReviewItem[]` をインライン投稿 |
| GET/PUT | `/api/settings` | `AppSettings` の取得・更新 |

---

## 10. 画面構成

1. **ダッシュボード / リポジトリ一覧** — リポジトリ検索・選択。認証状態バナー。
2. **PR 一覧** — 選択リポジトリのオープン PR。各行に「レビュー実行」導線。
3. **レビュー結果画面** — 指摘カードの一覧（対象コード + 指摘 + 重要度バッジ + チェックボックス）、上部に「選択した N 件を PR に反映」ボタン、実行ログ/進捗。
4. **設定 / プロンプト編集** — レビュープロンプト編集、モデル選択。

### デザイン要件
- ダークテーマ固定。背景は深いニュートラルグレー、アクセント 1 色。
- 余白広め・タイポグラフィ重視のシンプルでスタイリッシュなダッシュボード。
- 重要度はバッジ色で区別（critical=赤系 / warning=黄系 / info=青系）。
- コードスニペットはシンタックスハイライト（例: shiki / prism）。

---

## 11. ディレクトリ構成（提案）

```
claude-review-dashboard/
├─ docs/
│  ├─ note.md
│  └─ development-design.md
├─ src/
│  ├─ app/
│  │  ├─ (dashboard)/...          # 画面
│  │  └─ api/...                  # Route Handlers
│  ├─ components/                 # UI（shadcn/ui ベース）
│  ├─ lib/
│  │  ├─ github/                  # gh / octokit ラッパー
│  │  ├─ review/                  # Agent SDK 連携・プロンプト・JSON抽出
│  │  ├─ settings/                # 設定ファイル I/O
│  │  └─ schema/                  # zod スキーマ・型
│  └─ styles/
├─ package.json
└─ ...
```

---

## 12. 実装マイルストーン（チェックリスト）

> AI エージェントは原則この順で実装する。各マイルストーンは独立して動作確認できる単位。完了した項目は `[x]` に更新すること。

### M0: プロジェクト基盤
- [x] Next.js 15（App Router）+ TypeScript プロジェクトを作成
- [x] Tailwind CSS + shadcn/ui を導入
- [x] ダークテーマ固定のグローバルレイアウト・カラートークンを定義
- [x] サイドバー / ヘッダーを含むダッシュボードのレイアウト枠を作成
- [x] lint / format（ESLint / Prettier）と基本スクリプトを整備

### M1: 認証・GitHub 取得系
- [x] `gh` CLI ラッパー（`lib/github`）を実装（`child_process` 実行・エラーハンドリング）
- [x] `GET /api/auth/status`（`gh auth status` でログイン状態・ユーザー名取得）
- [x] 未ログイン時に `gh auth login` を促す認証状態バナーを表示
- [x] `GET /api/repos`（リポジトリ一覧取得）
- [x] `GET /api/repos/{owner}/{repo}/pulls`（PR 一覧取得）
- [x] リポジトリ一覧 / PR 一覧画面を実装（検索・絞り込み）

### M2: レビュー実行（コア）
- [x] `@anthropic-ai/claude-agent-sdk` を導入
- [x] PR を一時ディレクトリへ checkout する処理を実装
- [x] PR diff・メタ情報を取得（`gh pr diff` / `gh pr view --json headRefOid`）
- [x] zod スキーマ（`ReviewItem` / `ReviewSession`）を定義
- [x] `buildReviewPrompt`（diff + ユーザープロンプト + 出力フォーマット指示）を実装
- [x] `query()` を呼び出しレビューを実行（Claude Code 認証再利用）
- [x] 出力 JSON の抽出 → zod 検証 → 失敗時 1 回リトライを実装
- [x] `POST /api/repos/{owner}/{repo}/pulls/{number}/review` で `ReviewSession` を返却
- [x] 一時ディレクトリのクリーンアップ

### M3: レビュー結果表示
- [x] 指摘カードコンポーネント（対象コード + 指摘本文 + 重要度バッジ + カテゴリ）
- [x] コードスニペットのシンタックスハイライト（shiki / prism）
- [x] チェックボックス（個別 / 全選択 / 全解除）
- [x] レビュー実行中のプログレス表示
- [x] レビュー結果画面の統合

### M4: PR 反映
- [x] 選択指摘を GitHub インラインレビューへ変換する処理
- [x] diff 範囲と行番号を突き合わせて投稿不可な指摘を検出・警告
- [x] `POST .../comments`（`POST /repos/.../pulls/.../reviews`, `event: COMMENT`）で一括投稿
- [x] 投稿成功後に各指摘を「反映済み」状態へ更新
- [x] 成功 / 失敗のトースト・エラーハンドリング

### M5: プロンプト調整 / 設定
- [x] `AppSettings` のローカルファイル I/O（`lib/settings`）
- [x] デフォルトレビュープロンプトを同梱
- [x] `GET/PUT /api/settings`
- [x] 設定 / プロンプト編集画面（プロンプト編集・モデル選択）

### M6: 仕上げ
- [x] レビュー進捗の SSE ストリーミング（任意）
- [x] 全体のエラーハンドリング・空状態 / ローディング状態の整備
- [x] デザインの磨き込み（余白・タイポグラフィ・バッジ色）
- [x] README（起動手順・前提となる `gh` / Claude Code 認証）を作成
- [x] 受け入れ基準（§13）を全て満たすことを確認

---

## 13. 受け入れ基準（Acceptance Criteria）

- [x] `gh` 認証済み状態で起動すると、ログインユーザー名とリポジトリ一覧が表示される。
- [x] リポジトリを選ぶとオープン PR 一覧が表示される。
- [x] PR を選び「レビュー実行」を押すと、AI レビューが走り、対象コード付きで指摘が一覧表示される。
- [x] 指摘を取捨選択（チェック）でき、選んだものだけが GitHub PR にインラインコメントとして投稿される。
- [x] 投稿された行が GitHub 上で正しい該当行に表示される。
- [x] レビュープロンプトを編集・保存でき、次回レビューに反映される。
- [x] Anthropic API キーを別途設定しなくても（Claude Code 認証再利用で）レビューが動く。

---

## 14. 非機能・制約・リスク

| 項目 | 方針 / 留意点 |
|------|---------------|
| シングルユーザー | ローカル起動前提。認証情報はマシンの `gh` / Claude Code に依存。 |
| セキュリティ | トークンはファイルに保存せず都度取得。レビュー対象リポジトリのコードを Claude に渡す点をユーザーに明示。 |
| LLM 出力の不安定性 | 構造化出力を zod 検証 + リトライで担保。失敗時は明確にエラー表示。 |
| 行番号ズレ | diff 範囲外の指摘は投稿前に検証して弾く。 |
| 大きい PR | diff が巨大な場合はトークン超過の恐れ。ファイル単位分割・上限設定を検討（将来対応可）。 |
| コスト | Claude Code サブスク認証を利用。実行回数に応じた利用がかかる旨を留意。 |

---

## 15. オープンな検討事項（実装時に判断）
- 進捗表示を SSE ストリーミングにするか、完了後一括返却にするか（M2 はまず一括で可）。
- レビュー履歴（`ReviewSession` 保存）を UI から閲覧可能にするか。
- 大規模 diff のチャンク分割戦略。
- インライン不可指摘の PR 全体コメントへのフォールバック有無。
