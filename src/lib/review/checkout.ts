import { gh } from "@/lib/github/gh";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface Checkout {
  dir: string;
  cleanup: () => Promise<void>;
}

/**
 * Check out the target PR into a temporary directory.
 * Fetches the repository with `gh repo clone`, then switches to the PR branch with `gh pr checkout`.
 * Uses a normal (non-shallow) clone to give Claude context for the whole repository.
 */
export async function checkoutPr(owner: string, repo: string, prNumber: number): Promise<Checkout> {
  const base = await mkdtemp(join(tmpdir(), "ai-review-"));
  const dir = join(base, repo);

  const cleanup = async () => {
    await rm(base, { recursive: true, force: true });
  };

  try {
    await gh(["repo", "clone", `${owner}/${repo}`, dir, "--", "--depth", "50"], {
      timeout: 300_000,
    });
    // A shallow clone creates no remote-tracking branches, so `gh pr checkout`'s
    // tracking setup fails with "is not a branch"; switch with --detach instead.
    // Reviews are read-only, so a detached HEAD is fine.
    await gh(["pr", "checkout", String(prNumber), "--detach"], { cwd: dir, timeout: 300_000 });
    return { dir, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
