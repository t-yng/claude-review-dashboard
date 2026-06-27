import type { PullRequestDetail } from "@/lib/schema/github";

/**
 * Build the prompt used for a review run.
 * - Includes the PR title, description, and diff
 * - Embeds the user-configured perspective (reviewPrompt)
 * - Specifies the output format (a JSON array of ReviewItem) and each field's meaning
 * - Instructs it to return line numbers on the new-file side (RIGHT) of the diff
 * - Instructs it to suppress noise
 */
export function buildReviewPrompt(pr: PullRequestDetail, userPrompt: string): string {
  return `${userPrompt}

---

# レビュー対象の Pull Request

リポジトリの全ファイルは作業ディレクトリから Read / Grep / Glob ツールで参照できます。必要に応じて周辺コードを読み、diff の変更を中心にレビューしてください。

## タイトル
${pr.title}

## 説明
${pr.body?.trim() || "(説明なし)"}

## 変更差分 (unified diff)
\`\`\`diff
${truncateDiff(pr.diff)}
\`\`\`

---

# 出力フォーマット（厳守）

レビュー結果を **下記スキーマの JSON 配列のみ** で出力してください。配列以外のテキスト・前置き・後置きは一切出力しないこと。指摘が無い場合は空配列 \`[]\` を返すこと。

\`\`\`json
[
  {
    "filePath": "string  // リポジトリルートからの相対パス。diff の +++ b/ のパスに一致させる",
    "startLine": 0,        // 指摘対象の開始行（diff の新ファイル側=RIGHT の行番号）
    "endLine": 0,          // 指摘対象の終了行（単一行なら startLine と同じ）
    "side": "RIGHT",       // 通常は RIGHT 固定
    "severity": "info | warning | critical",
    "category": "bug | performance | security | style | maintainability などの短い分類",
    "title": "string  // 指摘の短い見出し",
    "body": "string  // 指摘本文（Markdown 可）。なぜ問題か・どう直すべきかを具体的に",
    "codeSnippet": "string  // 対象コードの抜粋（表示用、数行程度）"
  }
]
\`\`\`

## 重要な制約
- **行番号は必ず diff に現れる新ファイル側(RIGHT)の行番号** を指定すること。diff に含まれない行を指定しないこと。
- 価値の低い・重複・好み次第の指摘は出さないこと。明確に意味のある指摘のみ。
- **\`title\` と \`body\` は必ず日本語で記述すること。** 識別子・コード・固有名詞などはそのまま英語で構わないが、説明文は日本語で書くこと。
- JSON 配列以外は絶対に出力しないこと。`;
}

/** Short prompt used on retry to re-instruct it to "return JSON only". */
export const JSON_ONLY_RETRY_PROMPT =
  "前回の出力は指定の JSON 配列として解析できませんでした。説明や前置きを一切付けず、ReviewItem スキーマの JSON 配列のみを再出力してください。";

/** Simple cap to guard against token overflow when the diff is huge. */
function truncateDiff(diff: string, maxChars = 120_000): string {
  if (diff.length <= maxChars) return diff;
  return (
    diff.slice(0, maxChars) +
    `\n\n... (diff が大きいため ${diff.length - maxChars} 文字を省略しました)`
  );
}
