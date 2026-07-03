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

# Pull Request under review

You can access every file in the repository from the working directory via the Read / Grep / Glob tools. Read the surrounding code as needed, and focus the review on the changes in the diff.

## Title
${pr.title}

## Description
${pr.body?.trim() || "(no description)"}

## Diff (unified diff)
\`\`\`diff
${truncateDiff(pr.diff)}
\`\`\`

---

# Output format (strict)

Output the review results as **only a JSON array matching the schema below**. Do not output any text, preamble, or postscript other than the array. If there are no findings, return an empty array \`[]\`.

\`\`\`json
[
  {
    "filePath": "string  // Path relative to the repository root. Must match the +++ b/ path in the diff",
    "startLine": 0,        // Start line of the finding (line number on the new-file side = RIGHT of the diff)
    "endLine": 0,          // End line of the finding (same as startLine for a single line)
    "side": "RIGHT",       // Normally fixed to RIGHT
    "severity": "info | warning | critical",
    "category": "A short classification such as bug | performance | security | style | maintainability",
    "title": "string  // A short heading for the finding",
    "body": "string  // The finding body (Markdown allowed). Explain concretely why it is a problem and how to fix it",
    "codeSnippet": "string  // An excerpt of the target code (for display, a few lines)"
  }
]
\`\`\`

## Important constraints
- **Line numbers must always be line numbers on the new-file side (RIGHT) that appear in the diff.** Do not specify lines that are not included in the diff.
- Do not produce low-value, duplicate, or purely preferential findings. Only clearly meaningful findings.
- **\`title\` and \`body\` MUST be written in Japanese.** Identifiers, code, and proper nouns may stay in English, but the explanatory text must be written in Japanese.
- Never output anything other than the JSON array.`;
}

/** Short prompt used on retry to re-instruct it to "return JSON only". */
export const JSON_ONLY_RETRY_PROMPT =
  "The previous output could not be parsed as the specified JSON array. Without any explanation or preamble, output only a JSON array matching the ReviewItem schema again.";

/** Simple cap to guard against token overflow when the diff is huge. */
function truncateDiff(diff: string, maxChars = 120_000): string {
  if (diff.length <= maxChars) return diff;
  return (
    diff.slice(0, maxChars) +
    `\n\n... (the diff is large, so ${diff.length - maxChars} characters were omitted)`
  );
}
