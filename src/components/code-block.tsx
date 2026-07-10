import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { cn } from "@/lib/utils";

/** Infer the shiki language from the file extension. */
function langFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    mjs: "javascript",
    cjs: "javascript",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    c: "c",
    h: "c",
    cpp: "cpp",
    cc: "cpp",
    cs: "csharp",
    php: "php",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    json: "json",
    yml: "yaml",
    yaml: "yaml",
    toml: "toml",
    sql: "sql",
    css: "css",
    scss: "scss",
    html: "html",
    vue: "vue",
    svelte: "svelte",
    md: "markdown",
  };
  return map[ext] ?? "text";
}

interface CodeBlockProps {
  code: string;
  filePath: string;
  className?: string;
}

/** Code snippet with syntax highlighting. */
export function CodeBlock({ code, filePath, className }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    codeToHtml(code.replace(/\n$/, ""), {
      lang: langFromPath(filePath),
      theme: "github-dark-default",
    })
      .then((out) => {
        if (active) setHtml(out);
      })
      .catch(() => {
        if (active) setHtml(null);
      });
    return () => {
      active = false;
    };
  }, [code, filePath]);

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[var(--radius)] border border-border bg-[#0d1117]",
        className,
      )}
    >
      {html ? (
        <div className="code-snippet" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="p-4 font-mono text-[0.8125rem] leading-relaxed text-muted-foreground">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
