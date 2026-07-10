import type { Owner, Repo, PullRequest } from "@/lib/schema/github";
import type { ReviewItem } from "@/lib/schema/review";
import type { AppSettings } from "@/lib/schema/settings";

/**
 * Client-side API facade. Previously wrapped HTTP calls to the Next.js API
 * routes; now delegates to the Electron main process via the preload bridge
 * (`window.api`). Return shapes are preserved so UI components are unaffected.
 */
export const api = {
  authStatus: () => window.api.auth.status(),
  owners: (): Promise<{ owners: Owner[] }> =>
    window.api.owners.list().then((owners) => ({ owners })),
  repos: (owner?: string): Promise<{ repos: Repo[] }> =>
    window.api.repos.list(owner).then((repos) => ({ repos })),
  pulls: (owner: string, repo: string): Promise<{ pulls: PullRequest[] }> =>
    window.api.pulls.list(owner, repo).then((pulls) => ({ pulls })),
  pullDetail: (owner: string, repo: string, number: number) =>
    window.api.pulls.detail(owner, repo, number),
  submitComments: (
    owner: string,
    repo: string,
    number: number,
    payload: { headSha: string; items: ReviewItem[] },
  ) => window.api.review.submit(owner, repo, number, payload),
  getSettings: () => window.api.settings.get(),
  saveSettings: (settings: AppSettings) => window.api.settings.save(settings),
};
