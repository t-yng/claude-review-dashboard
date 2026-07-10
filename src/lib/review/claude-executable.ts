import { createRequire } from "node:module";
import { join, sep } from "node:path";

/**
 * Resolve the path to the native `claude` executable shipped by the Claude
 * Agent SDK's platform-specific package
 * (e.g. `@anthropic-ai/claude-agent-sdk-darwin-arm64/claude`).
 *
 * Why we resolve this ourselves instead of letting the SDK do it:
 * In a packaged Electron app the SDK resolves the binary to a path *inside*
 * `app.asar`. Node's fs is asar-aware, so `existsSync` reports it as present,
 * but `child_process.spawn` uses the real OS exec, which is NOT asar-aware.
 * `app.asar` is a single file, so spawning `.../app.asar/node_modules/.../claude`
 * fails with `spawn ENOTDIR` (a file is being treated as a directory).
 *
 * `asarUnpack` extracts the binary to `app.asar.unpacked`, so we resolve the
 * package path and rewrite `app.asar` → `app.asar.unpacked`. Outside a package
 * (dev / `electron-vite dev`) there is no `app.asar` segment, so the resolved
 * path is returned unchanged.
 *
 * Returns `undefined` if no matching package is installed, in which case the
 * caller should fall back to the SDK's own resolution.
 */
export function resolveClaudeExecutable(): string | undefined {
  // Resolve relative to this bundle (out/main/index.js) so the SDK's
  // node_modules sibling packages are on the resolution path.
  const nodeRequire = createRequire(join(__dirname, "index.js"));

  for (const specifier of candidateSpecifiers()) {
    try {
      const resolved = nodeRequire.resolve(specifier);
      const asarSegment = `${sep}app.asar${sep}`;
      return resolved.includes(asarSegment)
        ? resolved.replace(asarSegment, `${sep}app.asar.unpacked${sep}`)
        : resolved;
    } catch {
      // Try the next candidate.
    }
  }
  return undefined;
}

/** Package/binary specifiers to try, mirroring the SDK's own platform logic. */
function candidateSpecifiers(): string[] {
  const { platform, arch } = process;
  const base = "@anthropic-ai/claude-agent-sdk";
  const bin = platform === "win32" ? "claude.exe" : "claude";

  // On Linux both a glibc and a musl variant may exist; try both.
  const ids =
    platform === "linux"
      ? [`${platform}-${arch}-musl`, `${platform}-${arch}`]
      : [`${platform}-${arch}`];

  return ids.map((id) => `${base}-${id}/${bin}`);
}
