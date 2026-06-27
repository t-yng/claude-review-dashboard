import type {
  AuthStatus,
  Owner,
  Repo,
  PullRequest,
  PullRequestDetail,
} from "@/lib/schema/github";
import type { ReviewItem, ReviewSession } from "@/lib/schema/review";
import type { AppSettings } from "@/lib/schema/settings";
import type { SubmitResult } from "@/lib/github/reviews";

/** fetch wrapper. Throws with the API's error message on non-2xx responses. */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  authStatus: () => request<AuthStatus>("/api/auth/status"),
  owners: () => request<{ owners: Owner[] }>("/api/owners"),
  repos: (owner?: string) =>
    request<{ repos: Repo[] }>(
      owner ? `/api/repos?owner=${encodeURIComponent(owner)}` : "/api/repos",
    ),
  pulls: (owner: string, repo: string) =>
    request<{ pulls: PullRequest[] }>(`/api/repos/${owner}/${repo}/pulls`),
  pullDetail: (owner: string, repo: string, number: number) =>
    request<PullRequestDetail>(`/api/repos/${owner}/${repo}/pulls/${number}`),
  review: (owner: string, repo: string, number: number) =>
    request<ReviewSession>(`/api/repos/${owner}/${repo}/pulls/${number}/review`, {
      method: "POST",
    }),
  submitComments: (
    owner: string,
    repo: string,
    number: number,
    payload: { headSha: string; items: ReviewItem[] },
  ) =>
    request<SubmitResult>(`/api/repos/${owner}/${repo}/pulls/${number}/comments`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getSettings: () => request<AppSettings>("/api/settings"),
  saveSettings: (settings: AppSettings) =>
    request<AppSettings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
};
