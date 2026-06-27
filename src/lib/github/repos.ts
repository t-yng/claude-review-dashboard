import { gh, ghJson } from "./gh";
import { repoSchema, type Repo, type Owner } from "@/lib/schema/github";
import { z } from "zod";

const REPO_FIELDS = "nameWithOwner,name,owner,description,isPrivate,updatedAt,pushedAt";

/** Sort in descending order of pushedAt (falling back to updatedAt). */
function sortByPushedAt(repos: Repo[]): Repo[] {
  return [...repos].sort((a, b) => {
    const ta = a.pushedAt ?? a.updatedAt ?? "";
    const tb = b.pushedAt ?? b.updatedAt ?? "";
    return tb.localeCompare(ta);
  });
}

/** Get the login of the authenticated user. */
async function getViewer(): Promise<string> {
  const out = await gh(["api", "user", "--jq", ".login"]);
  return out.trim();
}

/** Get the list of organization logins the authenticated user belongs to. */
async function listOrgs(): Promise<string[]> {
  // The --jq output is a newline-separated string, so handle the raw stdout.
  const out = await gh(["api", "user/orgs", "--paginate", "--jq", ".[].login"]).catch(() => "");
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Get candidate repository owners (yourself + organizations you belong to).
 * The first entry is always the authenticated user, followed by organizations.
 */
export async function listOwners(): Promise<Owner[]> {
  const [viewer, orgs] = await Promise.all([getViewer(), listOrgs()]);
  return [
    { login: viewer, type: "user" as const },
    ...orgs.map((login) => ({ login, type: "organization" as const })),
  ];
}

/** Fetch the repository list for the given owner (user or organization). */
async function listReposForOwner(owner: string | null, limit: number): Promise<Repo[]> {
  const args = ["repo", "list"];
  if (owner) args.push(owner);
  args.push("--limit", String(limit), "--json", REPO_FIELDS);
  const raw = await ghJson<unknown>(args);
  return z.array(repoSchema).parse(raw);
}

/**
 * Fetch the list of accessible repositories.
 *
 * When `owner` is given, only that owner's repositories are fetched.
 * When omitted, repositories from yourself + all your organizations are merged.
 * In both cases, results are sorted by pushedAt in descending order.
 */
export async function listRepos(owner?: string, limit = 100): Promise<Repo[]> {
  if (owner) {
    return sortByPushedAt(await listReposForOwner(owner, limit));
  }

  const orgs = await listOrgs();
  const owners: (string | null)[] = [null, ...orgs];

  const results = await Promise.all(
    owners.map((o) => listReposForOwner(o, limit).catch(() => [] as Repo[])),
  );

  // Deduplicate by nameWithOwner
  const byName = new Map<string, Repo>();
  for (const repo of results.flat()) {
    if (!byName.has(repo.nameWithOwner)) byName.set(repo.nameWithOwner, repo);
  }

  return sortByPushedAt([...byName.values()]);
}
