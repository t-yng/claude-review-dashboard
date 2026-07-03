# AI Review Dashboard Development Design Document

## 1. Product Overview

### 1.1 Purpose
A local web application that has an AI perform code review on Pull Requests, lets the **user cherry-pick only the valuable findings** from the multiple generated review comments, and applies only the selected ones to the GitHub PR as inline review comments.

### 1.2 Problem to Solve
- AI review is convenient, but it also generates unnecessary or off-target findings.
- Even when an AI reviews a junior's PR, the reviewee cannot judge whether the findings are good or bad.
- In the end a senior still has to review in detail, which is a heavy burden.
- → Create a state where **the senior only has to "pick from the AI's findings"**, semi-automating the review process.

### 1.3 Target Users / Use Cases
- A reviewer (senior engineer) runs the app in their own local environment.
- Reuses the local Claude Code auth and `gh` auth as-is.
- Assumes a single user running locally (multi-tenant / shared server is out of scope).

---

## 2. Confirmed Technical Decisions (Decision Log)

| Item | Decision | Rationale |
|------|----------|-----------|
| Delivery form | **Local web app** | The server-side process can call the SDK / gh, keeping the implementation simple. Opened in a browser. |
| AI integration | **Reuse Claude Agent SDK + Claude Code CLI auth** | Uses the local Claude Code auth (`~/.claude/auth.json`) as-is. No API key management needed. |
| GitHub auth | **Reuse `gh` CLI auth** | Reuses the existing `gh auth login`. No OAuth App registration needed — the fastest path. Tokens obtained via `gh auth token`. |
| PR application form | **Line-level inline review comments** | Tied to the relevant line of the target code. Close to the native review experience. |

> The above are confirmed. If a change is required due to technical constraints during implementation, update this table.

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 15 (App Router)** / TypeScript |
| Runtime | Node.js 20+ (verified: v24 / `gh` 2.80) |
| UI | React 19 + **Tailwind CSS** + **shadcn/ui** |
| Icons | lucide-react |
| State management | Server: Route Handlers / Server Actions, Client: TanStack Query (or SWR) |
| AI integration | **`@anthropic-ai/claude-agent-sdk`** |
| GitHub integration | `gh` CLI (`child_process`) + `@octokit/rest` as needed (tokens via `gh auth token`) |
| Validation | **zod** (essential for structured validation of AI output) |
| Local persistence | Files (JSON under `~/.config/claude-review-dashboard/`) |
| Design | Dark-themed dashboard. Simple / stylish. |

> When implementing the UI, using the `ui-ux-pro-max` skill is recommended (design support for dark-themed dashboards).

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (React / shadcn UI, dark theme)                       │
│   - Repository / PR list                                      │
│   - Run review button                                         │
│   - Review findings list + target code display + checkboxes   │
│   - Prompt editing screen                                     │
└───────────────▲─────────────────────────────────────────────┘
                │  fetch (REST / Server Actions)
┌───────────────┴─────────────────────────────────────────────┐
│ Next.js Server (Node.js, launched locally)                    │
│                                                              │
│  ┌────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │ GitHub layer│ │ Review Engine  │  │ Settings / Prompt  │  │
│  │ (gh/octokit)│ │ (Agent SDK)    │  │ Store (file)       │  │
│  └─────┬──────┘  └───────┬────────┘  └─────────┬──────────┘  │
└────────┼─────────────────┼─────────────────────┼─────────────┘
         │                 │                     │
   ┌─────▼─────┐     ┌─────▼──────┐        ┌─────▼─────┐
   │ GitHub API│     │ Claude     │        │ Local     │
   │ (gh auth) │     │ (Claude    │        │ files     │
   │           │     │  Code auth) │        │           │
   └───────────┘     └────────────┘        └───────────┘
```

### 4.1 Data Flow of a Review Run
1. The user selects a PR and presses "Run review".
2. The server checks out the target PR into a temporary directory (equivalent to `gh pr checkout`).
3. Assembles the PR diff (`gh pr diff`), metadata, and the user-configured review prompt.
4. Runs the Claude Agent SDK's `query()` with `cwd = temp repository` and `allowedTools: ["Read","Grep","Glob","Bash"]`. Gives Claude the context of the whole repository while having it review with a focus on the diff.
5. Receives the review results as **structured JSON** (the `ReviewItem[]` described below) and validates them with zod.
6. Saves the review results as a `ReviewSession` and returns them to the client.
7. The user checks findings and presses "Apply to PR".
8. The server posts the selected findings as GitHub inline review comments.

---

## 5. Key Features and Requirements

### F-1. GitHub Auth (reuse gh)
- On app startup, run `gh auth status` to get the login state and username.
- When not logged in, show that in the UI and prompt the user to run `gh auth login` (the app itself does not run it).
- Tokens for GitHub API calls are fetched each time via `gh auth token` (not stored).

### F-2. Repository / PR List
- List repositories accessible to the user (searchable / filterable).
- Selecting a repository shows its open PR list (number, title, author, updated time, changed line count, branch).
- The list is obtained via `gh` or Octokit.

### F-3. Run Review
- Start the AI review with the "Run review" button on the PR detail screen.
- While running, show progress (checkout → analysis → review generation).
- Progress may be reflected to the client via SSE etc. using the SDK's streaming messages (optional).

### F-4. Review Results List
- For each finding, display:
  - Target file path and line range
  - **Snippet of the target code** (with the relevant lines highlighted)
  - Finding body (Markdown)
  - Severity (`severity`: info / warning / critical)
  - Category (`category`: bug / performance / security / style / maintainability, etc.)
- A checkbox for each finding. Select-all / deselect-all available.

### F-5. Apply to PR
- Post only the checked findings as GitHub PR **inline review comments**.
- Post them together as a single Review (`event: COMMENT`) in one operation.
- Findings whose line info is not in the diff are flagged as non-postable in the UI (falling back to a whole-PR comment is possible, optional).
- After a successful post, mark each finding as "applied".

### F-6. Adjusting the Review Prompt
- A settings screen where review perspectives / priorities can be freely edited as text.
- The content is persisted locally. A default prompt is bundled.
- The prompt is injected into the system prompt or user prompt when running a review.

---

## 6. Data Model

```ts
// A single review finding
interface ReviewItem {
  id: string;                 // uuid
  filePath: string;           // e.g. "src/api/user.ts"
  startLine: number;          // line number on the new-file side of the diff
  endLine: number;
  side: "RIGHT" | "LEFT";     // GitHub review line side. Usually RIGHT
  severity: "info" | "warning" | "critical";
  category: string;           // bug / performance / security / style / maintainability ...
  title: string;              // short heading
  body: string;               // finding body (Markdown)
  codeSnippet: string;        // excerpt of the target code (for display)
  status: "pending" | "submitted" | "skipped";
}

// A single review run
interface ReviewSession {
  id: string;
  repo: string;               // "owner/name"
  prNumber: number;
  headSha: string;            // required for posting inline comments (commit_id)
  promptUsed: string;         // the prompt used at run time (saved for reproducibility)
  model: string;              // model used
  items: ReviewItem[];
  createdAt: string;          // ISO8601
}

// User settings
interface AppSettings {
  reviewPrompt: string;       // the prompt from F-6
  model: string;              // default: "claude-opus-4-8" (alias "opus" allowed)
}
```

### Persistence Locations
- `~/.config/claude-review-dashboard/settings.json` … `AppSettings`
- `~/.config/claude-review-dashboard/sessions/<sessionId>.json` … `ReviewSession` (history, optional)

---

## 7. Implementation Guidelines for AI Review Integration

### 7.1 Example query() Call
```ts
import { query } from "@anthropic-ai/claude-agent-sdk";

const result = query({
  prompt: buildReviewPrompt(diff, userPrompt), // see below
  options: {
    systemPrompt: { type: "preset", preset: "claude_code" },
    model: settings.model,            // e.g. "claude-opus-4-8"
    cwd: checkoutDir,                 // the checked-out temporary repository
    allowedTools: ["Read", "Grep", "Glob", "Bash"],
    permissionMode: "bypassPermissions", // auto-approve since local & read-centric
  },
});

for await (const message of result) {
  // Streaming progress (optionally to the client)
  // Extract JSON from the final assistant message
}
```
- Auth: The SDK automatically reuses the local Claude Code auth (`~/.claude/auth.json`), so no extra setup is needed.
- `permissionMode` is auto-approve since this is a local, read-tool-centric use case. The policy is to not let it run write / destructive commands (made explicit in the prompt).

### 7.2 Obtaining Structured Output
- Since LLM output tends to be free-form, force **"output only the specified JSON schema"** in the prompt and validate the output with `zod`.
- On extraction failure, retry once (re-instructing "return JSON only"). If it still fails, show an error in the UI.
- Recommended: extract the ```json block from the final message → `JSON.parse` → validate with `z.array(reviewItemSchema)`.

### 7.3 Prompt Assembly (responsibilities of buildReviewPrompt)
- Include the PR title, description, and diff.
- Embed the user-configured `reviewPrompt` (perspectives / priorities).
- Clearly state the output format (a JSON array of `ReviewItem`) and the meaning of each field.
- Instruct it to return line numbers as the **line numbers on the new-file (RIGHT) side of the diff** (required for posting inline comments).
- Include noise-suppression instructions like "do not produce low-value, duplicate, or preference-dependent findings".

---

## 8. Implementation Guidelines for GitHub Integration

### 8.1 Retrieval
- Repository list: `gh repo list --json ...` or Octokit.
- PR list: `gh pr list --repo owner/name --json number,title,author,updatedAt,...`.
- PR diff: `gh pr diff <num> --repo owner/name`.
- head SHA: `gh pr view <num> --json headRefOid`.

### 8.2 Checkout (temporary directory for review)
- Create a working directory under `os.tmpdir()` and fetch the target PR's branch.
- Clean up afterward. Cache reuse for re-reviewing the same PR is allowed (optional).

### 8.3 Posting Inline Reviews
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
- For multi-line findings, `start_line` / `start_side` can also be added.
- Token via `gh auth token`. Call through Octokit or `gh api`.
- Since the API errors when the target line is not included in the PR's diff, cross-check against the diff range beforehand and reject / warn.

---

## 9. API Design (Route Handlers)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/status` | gh login state / username |
| GET | `/api/repos` | List of accessible repositories |
| GET | `/api/repos/{owner}/{repo}/pulls` | PR list |
| GET | `/api/repos/{owner}/{repo}/pulls/{number}` | PR detail (including diff / headSha) |
| POST | `/api/repos/{owner}/{repo}/pulls/{number}/review` | Run review → returns a `ReviewSession` (progress via SSE possible) |
| POST | `/api/repos/{owner}/{repo}/pulls/{number}/comments` | Post the selected `ReviewItem[]` inline |
| GET/PUT | `/api/settings` | Get / update `AppSettings` |

---

## 10. Screen Structure

1. **Dashboard / Repository list** — repository search and selection. Auth-state banner.
2. **PR list** — open PRs of the selected repository. Each row has a "Run review" entry point.
3. **Review results screen** — a list of finding cards (target code + finding + severity badge + checkbox), an "Apply N selected to PR" button at the top, and a run log / progress.
4. **Settings / Prompt editing** — edit the review prompt and select the model.

### Design Requirements
- Fixed dark theme. Deep neutral-gray background, one accent color.
- A simple, stylish dashboard with generous whitespace and typography focus.
- Distinguish severity by badge color (critical=red-ish / warning=yellow-ish / info=blue-ish).
- Code snippets use syntax highlighting (e.g. shiki / prism).

---

## 11. Directory Structure (Proposal)

```
claude-review-dashboard/
├─ docs/
│  ├─ note.md
│  └─ development-design.md
├─ src/
│  ├─ app/
│  │  ├─ (dashboard)/...          # Screens
│  │  └─ api/...                  # Route Handlers
│  ├─ components/                 # UI (shadcn/ui based)
│  ├─ lib/
│  │  ├─ github/                  # gh / octokit wrapper
│  │  ├─ review/                  # Agent SDK integration, prompt, JSON extraction
│  │  ├─ settings/                # Settings file I/O
│  │  └─ schema/                  # zod schemas / types
│  └─ styles/
├─ package.json
└─ ...
```

---

## 12. Implementation Milestones (Checklist)

> The AI agent implements in this order in principle. Each milestone is a unit that can be verified independently. Update completed items to `[x]`.

### M0: Project Foundation
- [x] Create a Next.js 15 (App Router) + TypeScript project
- [x] Introduce Tailwind CSS + shadcn/ui
- [x] Define a fixed dark-theme global layout and color tokens
- [x] Create a dashboard layout frame including sidebar / header
- [x] Set up lint / format (ESLint / Prettier) and basic scripts

### M1: Auth / GitHub Retrieval
- [x] Implement a `gh` CLI wrapper (`lib/github`) (`child_process` execution, error handling)
- [x] `GET /api/auth/status` (get login state / username via `gh auth status`)
- [x] Show an auth-state banner prompting `gh auth login` when not logged in
- [x] `GET /api/repos` (get repository list)
- [x] `GET /api/repos/{owner}/{repo}/pulls` (get PR list)
- [x] Implement the repository list / PR list screens (search / filter)

### M2: Run Review (Core)
- [x] Introduce `@anthropic-ai/claude-agent-sdk`
- [x] Implement checking out a PR into a temporary directory
- [x] Get PR diff / metadata (`gh pr diff` / `gh pr view --json headRefOid`)
- [x] Define zod schemas (`ReviewItem` / `ReviewSession`)
- [x] Implement `buildReviewPrompt` (diff + user prompt + output format instructions)
- [x] Call `query()` to run the review (reusing Claude Code auth)
- [x] Implement output JSON extraction → zod validation → retry once on failure
- [x] Return a `ReviewSession` from `POST /api/repos/{owner}/{repo}/pulls/{number}/review`
- [x] Clean up the temporary directory

### M3: Review Results Display
- [x] Finding card component (target code + finding body + severity badge + category)
- [x] Syntax highlighting for code snippets (shiki / prism)
- [x] Checkboxes (individual / select-all / deselect-all)
- [x] Progress display while a review runs
- [x] Integrate the review results screen

### M4: Apply to PR
- [x] Logic to convert selected findings into GitHub inline reviews
- [x] Cross-check line numbers against the diff range to detect / warn about non-postable findings
- [x] Batch-post via `POST .../comments` (`POST /repos/.../pulls/.../reviews`, `event: COMMENT`)
- [x] Update each finding to the "applied" state after a successful post
- [x] Success / failure toasts and error handling

### M5: Prompt Adjustment / Settings
- [x] Local file I/O for `AppSettings` (`lib/settings`)
- [x] Bundle a default review prompt
- [x] `GET/PUT /api/settings`
- [x] Settings / prompt editing screen (prompt editing, model selection)

### M6: Finishing Touches
- [x] SSE streaming of review progress (optional)
- [x] Overall error handling, empty-state / loading-state polish
- [x] Design refinement (whitespace, typography, badge colors)
- [x] Create README (startup steps, prerequisite `gh` / Claude Code auth)
- [x] Confirm all acceptance criteria (§13) are met

---

## 13. Acceptance Criteria

- [x] When started with `gh` authenticated, the logged-in username and repository list are shown.
- [x] Selecting a repository shows the open PR list.
- [x] Selecting a PR and pressing "Run review" runs the AI review and shows findings in a list with their target code.
- [x] Findings can be cherry-picked (checked), and only the selected ones are posted to the GitHub PR as inline comments.
- [x] Posted lines appear on the correct target line on GitHub.
- [x] The review prompt can be edited and saved, and is reflected in the next review.
- [x] Reviews work without separately configuring an Anthropic API key (via reusing Claude Code auth).

---

## 14. Non-functional Aspects / Constraints / Risks

| Item | Policy / Notes |
|------|----------------|
| Single user | Assumes local startup. Auth info depends on the machine's `gh` / Claude Code. |
| Security | Tokens are fetched each time rather than stored in a file. Make it explicit to the user that the target repository's code is passed to Claude. |
| LLM output instability | Ensure structured output via zod validation + retry. Clearly show an error on failure. |
| Line-number drift | Findings outside the diff range are validated and rejected before posting. |
| Large PRs | A huge diff risks exceeding the token limit. Consider per-file splitting / limit settings (can be addressed in the future). |
| Cost | Uses Claude Code subscription auth. Note that usage accrues based on the number of runs. |

---

## 15. Open Questions (to decide during implementation)
- Whether to make progress display SSE-streamed or return it all at once after completion (M2 can start with all-at-once).
- Whether review history (saved `ReviewSession`) should be viewable from the UI.
- Chunk-splitting strategy for large diffs.
- Whether to fall back to a whole-PR comment for findings that can't be posted inline.
