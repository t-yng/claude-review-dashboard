import { z } from "zod";

/** Result of `gh auth status`. */
export interface AuthStatus {
  loggedIn: boolean;
  username: string | null;
  host: string | null;
  error?: string;
}

/** Candidate repository owner (yourself or an organization you belong to). */
export interface Owner {
  login: string;
  type: "user" | "organization";
}

/** A single entry in the repository list. */
export const repoSchema = z.object({
  nameWithOwner: z.string(),
  name: z.string(),
  owner: z.object({ login: z.string() }),
  description: z.string().nullable().optional(),
  isPrivate: z.boolean().optional(),
  updatedAt: z.string().optional(),
  pushedAt: z.string().nullable().optional(),
});
export type Repo = z.infer<typeof repoSchema>;

/** A single entry in the PR list. */
export const pullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  author: z.object({ login: z.string() }).nullable(),
  updatedAt: z.string(),
  additions: z.number().optional(),
  deletions: z.number().optional(),
  headRefName: z.string().optional(),
  baseRefName: z.string().optional(),
  url: z.string().optional(),
  isDraft: z.boolean().optional(),
});
export type PullRequest = z.infer<typeof pullRequestSchema>;

/** PR details (including diff and headSha). */
export interface PullRequestDetail extends PullRequest {
  body: string | null;
  headRefOid: string;
  diff: string;
}
