import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface Checkout {
  dir: string;
  cleanup: () => Promise<void>;
}

/** Run `git` and return stdout. Throws with stderr on failure. */
function git(args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      args,
      {
        cwd,
        timeout: 300_000,
        maxBuffer: 64 * 1024 * 1024,
        // No controlling terminal in a GUI app: disable interactive prompts so a
        // credential problem fails fast instead of hanging.
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      },
      (error, _stdout, stderr) => {
        if (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            reject(new Error("git not found. Please install Git."));
            return;
          }
          reject(new Error(stderr.trim() || error.message));
          return;
        }
        resolve(_stdout);
      },
    );
  });
}

/**
 * Check out the target PR into a temporary directory.
 *
 * The review only needs to *read* the repository at the PR head (the diff
 * itself comes from the GitHub API), so we fetch just that single commit at
 * depth 1 instead of cloning the whole repository. `gh repo clone` reconfigures
 * the remote to track every branch and performs an extra fetch, which is very
 * slow on repositories with many branches; a targeted shallow fetch of the PR
 * head is dramatically faster.
 *
 * Authentication reuses the gh CLI's git credential helper, so no token is
 * placed on the command line.
 */
export async function checkoutPr(owner: string, repo: string, prNumber: number): Promise<Checkout> {
  const base = await mkdtemp(join(tmpdir(), "ai-review-"));
  const dir = join(base, repo);

  const cleanup = async () => {
    await rm(base, { recursive: true, force: true });
  };

  const remoteUrl = `https://github.com/${owner}/${repo}.git`;
  // Reuse gh's stored credentials for HTTPS auth without exposing a token.
  const credentialArgs = [
    "-c",
    "credential.helper=",
    "-c",
    "credential.helper=!gh auth git-credential",
  ];

  try {
    await git(["init", "--quiet", dir]);
    await git(["-C", dir, "remote", "add", "origin", remoteUrl]);
    // Fetch only the PR head commit, shallow, without tags.
    await git([
      "-C",
      dir,
      ...credentialArgs,
      "fetch",
      "--quiet",
      "--depth",
      "1",
      "--no-tags",
      "origin",
      `pull/${prNumber}/head`,
    ]);
    // Reviews are read-only, so a detached HEAD is fine.
    await git(["-C", dir, "checkout", "--quiet", "--detach", "FETCH_HEAD"]);
    return { dir, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
