import { gh, GhError } from "./gh";
import type { AuthStatus } from "@/lib/schema/github";

/**
 * Run `gh auth status` to get the login state and the active account.
 *
 * When some of multiple accounts are invalid, `gh auth status` exits non-zero,
 * but its output (stderr) still contains valid login info. So we determine the
 * login state by parsing the output text rather than relying on the exit code.
 */
export async function getAuthStatus(): Promise<AuthStatus> {
  try {
    const out = await gh(["auth", "status"]);
    return parseAuthStatus(out);
  } catch (error) {
    if (error instanceof GhError) {
      const text = error.stderr || error.message;
      const status = parseAuthStatus(text);
      // If a valid account is found, treat it as logged in.
      if (status.loggedIn) return status;
      return { ...status, error: text.trim() };
    }
    return {
      loggedIn: false,
      username: null,
      host: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extract the active account from `gh auth status` output.
 * Example output:
 *   github.com
 *     ✓ Logged in to github.com account t-yng (keyring)
 *     - Active account: true
 */
function parseAuthStatus(text: string): AuthStatus {
  const loggedIn = /Logged in to/i.test(text);
  if (!loggedIn) {
    return { loggedIn: false, username: null, host: null };
  }

  const lines = text.split("\n");
  let lastUser: string | null = null;
  let lastHost: string | null = null;
  let activeUser: string | null = null;
  let activeHost: string | null = null;

  for (const line of lines) {
    const m = line.match(/Logged in to ([\w.-]+) account (\S+)/);
    if (m) {
      lastHost = m[1];
      lastUser = m[2];
    }
    if (/Active account:\s*true/i.test(line)) {
      activeUser = lastUser;
      activeHost = lastHost;
    }
  }

  return {
    loggedIn: true,
    username: activeUser ?? lastUser,
    host: activeHost ?? lastHost ?? "github.com",
  };
}
