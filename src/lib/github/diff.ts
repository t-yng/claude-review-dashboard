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
