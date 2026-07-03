/**
 * Parse a unified diff (output of `gh pr diff`) and return, per file,
 * the set of new-file-side (RIGHT) line numbers included in the PR diff.
 *
 * GitHub inline comments can only be attached to lines that appear in the diff,
 * so this is used for pre-submission validation. Added lines (+) and context
 * lines (starting with a space) are included.
 */
export type DiffLineMap = Map<string, Set<number>>;

export function parseDiffRightLines(diff: string): DiffLineMap {
  const map: DiffLineMap = new Map();
  const lines = diff.split("\n");

  let currentFile: string | null = null;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      currentFile = null;
      continue;
    }
    // New-file-side path. Format: "+++ b/path".
    if (line.startsWith("+++ ")) {
      const path = line.slice(4).trim();
      if (path === "/dev/null") {
        currentFile = null;
      } else {
        currentFile = path.replace(/^b\//, "");
        if (!map.has(currentFile)) map.set(currentFile, new Set());
      }
      continue;
    }
    if (line.startsWith("--- ")) {
      continue;
    }
    // Hunk header: @@ -a,b +c,d @@
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = parseInt(hunk[1], 10);
      continue;
    }
    if (currentFile === null) continue;

    if (line.startsWith("+")) {
      map.get(currentFile)!.add(newLine);
      newLine += 1;
    } else if (line.startsWith("-")) {
      // Deleted lines do not advance the new-file-side line number.
    } else if (line.startsWith("\\")) {
      // "\ No newline at end of file"
    } else {
      // Context line.
      map.get(currentFile)!.add(newLine);
      newLine += 1;
    }
  }

  return map;
}

/** Determine whether the given file/line is in the diff and can take an inline comment. */
export function isLineInDiff(map: DiffLineMap, filePath: string, line: number): boolean {
  const set = map.get(filePath);
  return set ? set.has(line) : false;
}

/** A contiguous new-file-side (RIGHT) line range covered by a single diff hunk. */
export interface HunkRange {
  start: number;
  end: number;
}
export type DiffHunkMap = Map<string, HunkRange[]>;

/**
 * Parse a unified diff and return, per file, the new-file-side (RIGHT) line
 * ranges covered by each hunk. A hunk header `@@ -a,b +c,d @@` covers the
 * contiguous range [c, c + d - 1] on the new side (all added/context lines).
 *
 * GitHub requires that a multi-line inline comment's `start_line` and `line`
 * belong to the same hunk, so this is used to validate multi-line ranges.
 */
export function parseDiffHunks(diff: string): DiffHunkMap {
  const map: DiffHunkMap = new Map();
  const lines = diff.split("\n");
  let currentFile: string | null = null;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      currentFile = null;
      continue;
    }
    if (line.startsWith("+++ ")) {
      const path = line.slice(4).trim();
      if (path === "/dev/null") {
        currentFile = null;
      } else {
        currentFile = path.replace(/^b\//, "");
        if (!map.has(currentFile)) map.set(currentFile, []);
      }
      continue;
    }
    if (line.startsWith("--- ")) continue;

    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (hunk && currentFile !== null) {
      const start = parseInt(hunk[1], 10);
      const count = hunk[2] !== undefined ? parseInt(hunk[2], 10) : 1;
      // count === 0 means the file has no new-side lines in this hunk (pure deletion).
      if (count > 0) {
        map.get(currentFile)!.push({ start, end: start + count - 1 });
      }
    }
  }

  return map;
}

/** Return the hunk containing the given file/line, or undefined if none. */
export function findHunk(
  map: DiffHunkMap,
  filePath: string,
  line: number,
): HunkRange | undefined {
  const hunks = map.get(filePath);
  return hunks?.find((h) => line >= h.start && line <= h.end);
}

/**
 * Reason an inline comment range cannot be posted:
 * - `not-in-diff`: the referenced line is outside the PR diff.
 * - `reversed`: the start line comes after the end line.
 * - `multi-hunk`: a multi-line range straddles two hunks.
 * `line` points at the offending line for display.
 */
export interface RangeCommentIssue {
  code: "not-in-diff" | "reversed" | "multi-hunk";
  line: number;
}

/**
 * Validate that a (possibly multi-line) inline comment range can be posted:
 * both endpoints must sit within the diff, and for multi-line ranges within
 * the same hunk. Returns null when the range is valid.
 */
export function rangeCommentIssue(
  map: DiffHunkMap,
  filePath: string,
  startLine: number,
  endLine: number,
): RangeCommentIssue | null {
  const endHunk = findHunk(map, filePath, endLine);
  if (!endHunk) return { code: "not-in-diff", line: endLine };
  if (startLine === endLine) return null;
  if (startLine > endLine) return { code: "reversed", line: startLine };
  const startHunk = findHunk(map, filePath, startLine);
  if (!startHunk) return { code: "not-in-diff", line: startLine };
  if (startHunk !== endHunk) return { code: "multi-hunk", line: startLine };
  return null;
}

/** Format a RangeCommentIssue as an English, human-readable reason string. */
export function rangeCommentError(
  map: DiffHunkMap,
  filePath: string,
  startLine: number,
  endLine: number,
): string | null {
  const issue = rangeCommentIssue(map, filePath, startLine, endLine);
  if (!issue) return null;
  switch (issue.code) {
    case "not-in-diff":
      return `${filePath}:${issue.line} is not part of the PR diff, so it cannot be posted inline.`;
    case "reversed":
      return `${filePath}: start line ${startLine} must not be after end line ${endLine}.`;
    case "multi-hunk":
      return `${filePath}:${startLine}-${endLine} spans multiple diff hunks; inline comments must stay within a single hunk.`;
  }
}
