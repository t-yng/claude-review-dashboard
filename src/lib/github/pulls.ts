import { gh, ghJson } from "./gh";
import { pullRequestSchema, type PullRequest, type PullRequestDetail } from "@/lib/schema/github";
import { z } from "zod";

const repoFlag = (owner: string, repo: string) => ["--repo", `${owner}/${repo}`];

/** Fetch the list of open PRs for the given repository. */
export async function listPulls(owner: string, repo: string, limit = 50): Promise<PullRequest[]> {
  const fields =
    "number,title,author,updatedAt,additions,deletions,headRefName,baseRefName,url,isDraft";
  const raw = await ghJson<unknown>([
    "pr",
    "list",
    ...repoFlag(owner, repo),
    "--state",
    "open",
    "--limit",
    String(limit),
    "--json",
    fields,
  ]);
  return z.array(pullRequestSchema).parse(raw);
}

/** Fetch PR details (metadata + diff + headSha). */
export async function getPullDetail(
  owner: string,
  repo: string,
  number: number,
): Promise<PullRequestDetail> {
  const fields =
    "number,title,author,updatedAt,additions,deletions,headRefName,baseRefName,url,isDraft,body,headRefOid";
  const detailSchema = pullRequestSchema.extend({
    body: z.string().nullable(),
    headRefOid: z.string(),
  });

  const [raw, diff] = await Promise.all([
    ghJson<unknown>(["pr", "view", String(number), ...repoFlag(owner, repo), "--json", fields]),
    gh(["pr", "diff", String(number), ...repoFlag(owner, repo)]),
  ]);

  const detail = detailSchema.parse(raw);
  return { ...detail, diff };
}
