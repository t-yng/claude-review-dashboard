import { execFileSync } from "node:child_process";
import { delimiter } from "node:path";

/**
 * GUI apps launched from Finder/Dock on macOS (and Linux) do NOT inherit the
 * PATH configured in the user's shell (~/.zshrc, ~/.bash_profile, etc.).
 * As a result CLIs like `gh` — typically installed under /opt/homebrew/bin or
 * a version manager (asdf/nvm) — cannot be found, and `execFile("gh", ...)`
 * fails with ENOENT even though it works when the app is started from a
 * terminal (which does pass the shell's PATH through).
 *
 * This resolves the PATH the user's login shell would produce and merges it
 * into process.env.PATH so every child process (gh, the Claude agent SDK, …)
 * can locate binaries the same way the terminal does.
 */
export function fixPath(): void {
  // On Windows GUI processes already inherit the system PATH.
  if (process.platform === "win32") return;

  const shell = process.env["SHELL"] || "/bin/zsh";

  try {
    // Run the shell as an interactive login shell so it sources the user's
    // rc files, then print PATH. The markers let us extract just the PATH even
    // if the rc files emit other output.
    const stdout = execFileSync(
      shell,
      ["-ilc", 'echo -n "_PATH_START_"; printenv PATH; echo -n "_PATH_END_"'],
      { encoding: "utf8", timeout: 5000 },
    );

    const match = stdout.match(/_PATH_START_([\s\S]*?)_PATH_END_/);
    const shellPath = match?.[1].trim();
    if (!shellPath) return;

    // Merge, keeping the shell's entries first and dropping duplicates.
    const merged = [
      ...shellPath.split(delimiter),
      ...(process.env["PATH"]?.split(delimiter) ?? []),
    ].filter((dir, i, all) => dir && all.indexOf(dir) === i);

    process.env["PATH"] = merged.join(delimiter);
  } catch {
    // If the shell can't be probed, fall back to appending the usual install
    // locations so at least Homebrew-installed CLIs remain discoverable.
    const fallbacks = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];
    const existing = process.env["PATH"]?.split(delimiter) ?? [];
    const merged = [...existing, ...fallbacks].filter(
      (dir, i, all) => dir && all.indexOf(dir) === i,
    );
    process.env["PATH"] = merged.join(delimiter);
  }
}
