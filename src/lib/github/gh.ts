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

/**
 * Extract a human-readable detail from a `gh api` error body written to stdout.
 * GitHub returns e.g. `{"message":"Unprocessable Entity","errors":[...]}`.
 * Returns `undefined` when stdout is empty or not a recognizable error body.
 */
function extractApiErrorDetail(stdout: string): string | undefined {
  const trimmed = stdout.trim();
  if (!trimmed) return undefined;
  let body: unknown;
  try {
    body = JSON.parse(trimmed);
  } catch {
    return undefined;
  }
  if (typeof body !== "object" || body === null) return undefined;

  const { message, errors } = body as {
    message?: unknown;
    errors?: unknown;
  };
  const base = typeof message === "string" ? message : undefined;

  // `errors` can be an array of strings or of objects ({ resource, field, code, message }).
  const details = Array.isArray(errors)
    ? errors
        .map((e) => {
          if (typeof e === "string") return e;
          if (e && typeof e === "object") {
            const obj = e as { message?: unknown; code?: unknown; field?: unknown };
            if (typeof obj.message === "string") return obj.message;
            if (typeof obj.code === "string") {
              return typeof obj.field === "string" ? `${obj.field}: ${obj.code}` : obj.code;
            }
          }
          return undefined;
        })
        .filter((s): s is string => Boolean(s))
    : [];

  if (base && details.length > 0) return `${base}: ${details.join("; ")}`;
  if (details.length > 0) return details.join("; ");
  return base;
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
        // A GUI-launched app has no controlling terminal, so gh/git would hang
        // forever waiting on an interactive credential or confirmation prompt.
        // Disable all prompting so a missing/invalid credential fails fast with
        // a real error instead of hanging.
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: "0",
          GH_PROMPT_DISABLED: "1",
          GH_NO_UPDATE_NOTIFIER: "1",
        },
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
          // For API errors, `gh api` prints only a short reason to stderr
          // (e.g. "gh: Unprocessable Entity (HTTP 422)") but writes the full
          // JSON body — including the detailed `errors` array — to stdout.
          // Prefer that detail so callers can surface the real cause.
          const detail = extractApiErrorDetail(stdout);
          reject(
            new GhError(
              detail || stderr.trim() || error.message,
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
