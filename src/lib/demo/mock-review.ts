import type { PullRequestDetail } from "@/lib/schema/github";
import type { ReviewItem, ReviewSession } from "@/lib/schema/review";

/**
 * Static mock data used by the `/demo` route.
 *
 * This lets the review-results screen be rendered (and screenshotted for the
 * portfolio) without any GitHub / Claude authentication or network access.
 * The findings intentionally reference real files in this repository so the
 * demo reads like an authentic review of the project itself.
 */

export const DEMO_OWNER = "t-yng";
export const DEMO_REPO = "claude-review-dashboard";
export const DEMO_PR_NUMBER = 5;

export const demoUser = "t-yng";

export const demoPull: PullRequestDetail = {
  number: DEMO_PR_NUMBER,
  title: "feat: stream review progress over SSE and pre-validate inline ranges",
  author: { login: "t-yng" },
  updatedAt: "2026-07-02T04:12:00Z",
  additions: 214,
  deletions: 38,
  headRefName: "feat/streaming-review",
  baseRefName: "main",
  url: `https://github.com/${DEMO_OWNER}/${DEMO_REPO}/pull/${DEMO_PR_NUMBER}`,
  isDraft: false,
  body: "Runs the review over Server-Sent Events so the UI can show live progress, and validates each finding against the PR diff before it can be posted as an inline comment. Adds hunk-range parsing and client-side pre-selection of postable findings.",
  headRefOid: "9f3c1ab7d2e4c8b5a1f6042d7e9c3b8a4d5e6f70",
  diff: "",
};

export const demoModel = "claude-opus-4-8";

export const demoItems: ReviewItem[] = [
  {
    id: "demo-1",
    filePath: "src/lib/client/review-stream.ts",
    startLine: 43,
    endLine: 56,
    side: "RIGHT",
    severity: "critical",
    category: "Reliability",
    title: "Trailing SSE event is dropped when the stream closes without a blank-line terminator",
    body: "The read loop only dispatches events once it finds a `\\n\\n` delimiter in the buffer. If the server closes the connection right after writing the final `session` event and omits the trailing blank line, that event stays in `buffer` and is never dispatched — the UI then hangs in the \"Reviewing…\" state even though the review actually completed.\n\nFlush the remaining buffer after the loop breaks on `done`:\n\n    if (buffer.trim()) dispatch(buffer, handlers);\n\nThis makes the client resilient to a missing terminator, which is easy to hit when the stream ends on error or on the last chunk.",
    codeSnippet:
      "for (;;) {\n  const { value, done } = await reader.read();\n  if (done) break; // <- trailing buffer is discarded here\n  buffer += decoder.decode(value, { stream: true });\n  ...\n}",
    status: "pending",
  },
  {
    id: "demo-2",
    filePath: "src/lib/github/gh.ts",
    startLine: 114,
    endLine: 117,
    side: "RIGHT",
    severity: "critical",
    category: "Reliability",
    title: "child.stdin write can raise an unhandled EPIPE when gh exits early",
    body: "When `options.input` is set, the code writes to `child.stdin` without attaching an `error` listener. If the `gh` subprocess exits before draining stdin (for example when the arguments are rejected), Node emits an asynchronous `EPIPE` on the stream. With no listener this surfaces as an unhandled `error` event and can crash the whole Next.js server process.\n\nAttach a no-op error handler before writing:\n\n    child.stdin?.on(\"error\", () => {});\n    child.stdin?.write(options.input);\n    child.stdin?.end();",
    codeSnippet:
      "if (options.input !== undefined) {\n  child.stdin?.write(options.input);\n  child.stdin?.end();\n}",
    status: "pending",
  },
  {
    id: "demo-3",
    filePath: "src/components/app/review-workspace.tsx",
    startLine: 84,
    endLine: 88,
    side: "RIGHT",
    severity: "warning",
    category: "React",
    title: "selectableIds suppresses hunkMap from its dependency array",
    body: "`selectableIds` calls `invalidReason`, which closes over `hunkMap`, but `hunkMap` is removed from the dependency array via the eslint-disable comment. When the PR diff finishes loading *after* the review results are already set in state, this memo will not recompute, so findings that just became postable stay unselectable until the next unrelated re-render.\n\nSince `hunkMap` is itself a stable `useMemo` value, adding it to the deps is safe and removes the need to silence the lint rule.",
    codeSnippet:
      "const selectableIds = useMemo(\n  () => sortedItems.filter((i) => i.status !== \"submitted\" && !invalidReason(i)).map((i) => i.id),\n  // eslint-disable-next-line react-hooks/exhaustive-deps\n  [sortedItems, hunkMap],\n);",
    status: "pending",
  },
  {
    id: "demo-4",
    filePath: "src/lib/github/diff.ts",
    startLine: 11,
    endLine: 60,
    side: "RIGHT",
    severity: "info",
    category: "Performance",
    title: "parseDiffRightLines and parseDiffHunks each scan the full diff separately",
    body: "Both parsers independently `split(\"\\n\")` and walk the entire unified diff. On large PRs this doubles the parsing cost for what is essentially the same traversal. The per-line RIGHT set is fully determined by the hunk ranges, so `parseDiffRightLines` could be derived from `parseDiffHunks`' output (or the two could share a single pass) to avoid the duplicate work.",
    codeSnippet: "",
    status: "pending",
  },
  {
    id: "demo-5",
    filePath: "src/components/app/review-card.tsx",
    startLine: 25,
    endLine: 26,
    side: "RIGHT",
    severity: "info",
    category: "Maintainability",
    title: "Line-range label formatting is inlined in the card",
    body: "The `L{start}–{end}` vs `L{start}` formatting lives inside the component. Extracting a small `formatLineRange(item)` helper would let the same label be reused by the submit toast and any future summary/list view, and keeps the JSX focused on layout.",
    codeSnippet:
      "const lineLabel =\n  item.startLine === item.endLine\n    ? `L${item.startLine}`\n    : `L${item.startLine}\\u2013${item.endLine}`;",
    status: "submitted",
  },
];

export const demoSession: ReviewSession = {
  id: "demo-session",
  repo: `${DEMO_OWNER}/${DEMO_REPO}`,
  prNumber: DEMO_PR_NUMBER,
  headSha: demoPull.headRefOid,
  promptUsed: "",
  model: demoModel,
  items: demoItems,
  createdAt: "2026-07-02T04:14:30Z",
};
