import { execFile } from "node:child_process";

/** Error thrown when running the gh CLI. Retains stderr. */
export class GhError extends Error {
  constructor(
    message: string,
    public readonly stderr: string,
    public readonly code: number | null,
  ) {
    super(message);
    this.name = "GhError";
  }
}

interface GhOptions {
  /** String to pass on stdin (e.g. for `gh api --input -`). */
  input?: string;
  /** Working directory. */
  cwd?: string;
  /** Timeout (ms). */
  timeout?: number;
}

/**
 * Thin wrapper that runs the `gh` CLI via child_process and returns stdout.
 * Uses execFile (no shell), so it is resistant to injection.
 */
export function gh(args: string[], options: GhOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "gh",
      args,
      {
        cwd: options.cwd,
        timeout: options.timeout ?? 120_000,
        maxBuffer: 64 * 1024 * 1024,
        env: process.env,
      },
      (error, stdout, stderr) => {
        if (error) {
          const code = (error as NodeJS.ErrnoException & { code?: number }).code;
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            reject(
              new GhError(
                "gh CLI not found. Please install the GitHub CLI.",
                "",
                null,
              ),
            );
            return;
          }
          reject(
            new GhError(
              stderr.trim() || error.message,
              stderr,
              typeof code === "number" ? code : null,
            ),
          );
          return;
        }
        resolve(stdout);
      },
    );

    if (options.input !== undefined) {
      child.stdin?.write(options.input);
      child.stdin?.end();
    }
  });
}

/** Parse and return gh's JSON output. */
export async function ghJson<T>(args: string[], options: GhOptions = {}): Promise<T> {
  const out = await gh(args, options);
  return JSON.parse(out) as T;
}

/** Fetch a GitHub API token on demand (never stored). */
export async function getToken(): Promise<string> {
  const out = await gh(["auth", "token"]);
  return out.trim();
}
