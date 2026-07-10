/**
 * IPC contract shared between the Electron main process, the preload bridge,
 * and the renderer. Channel names are runtime constants; the `DesktopApi` type
 * describes the `window.api` surface exposed by the preload script.
 *
 * All non-type imports here must stay free of Node-only code so the renderer
 * can import the type definitions without pulling server modules into its bundle
 * (the `import type` references below are erased at build time).
 */
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
import type { ReviewProgress } from "@/lib/review/engine";
import type { Locale } from "@/i18n/config";

/** Channel names used with ipcMain.handle / ipcRenderer.invoke. */
export const IPC = {
  authStatus: "auth:status",
  ownersList: "owners:list",
  reposList: "repos:list",
  pullsList: "pulls:list",
  pullDetail: "pulls:detail",
  reviewRun: "review:run",
  reviewCancel: "review:cancel",
  reviewSubmit: "review:submit",
  settingsGet: "settings:get",
  settingsSave: "settings:save",
  localeGet: "locale:get",
  localeSet: "locale:set",
  openExternal: "shell:openExternal",
} as const;

/** Per-run progress event channel (suffixed with the run id). */
export const reviewProgressChannel = (runId: string) => `review:progress:${runId}`;

export interface ReviewRunHandlers {
  onProgress?: (p: ReviewProgress) => void;
  onSession?: (s: ReviewSession) => void;
  onError?: (message: string) => void;
}

export interface ReviewRunHandle {
  /** Best-effort cancellation of an in-flight review run. */
  cancel: () => void;
}

export interface SubmitCommentsPayload {
  headSha: string;
  items: ReviewItem[];
}

/** Result envelope returned by the review:run invoke. */
export type ReviewRunResult =
  | { ok: true; session: ReviewSession }
  | { ok: false; error: string };

/** Shape of `window.api` exposed to the renderer. */
export interface DesktopApi {
  auth: { status: () => Promise<AuthStatus> };
  owners: { list: () => Promise<Owner[]> };
  repos: { list: (owner?: string) => Promise<Repo[]> };
  pulls: {
    list: (owner: string, repo: string) => Promise<PullRequest[]>;
    detail: (owner: string, repo: string, number: number) => Promise<PullRequestDetail>;
  };
  review: {
    run: (
      owner: string,
      repo: string,
      number: number,
      handlers: ReviewRunHandlers,
    ) => ReviewRunHandle;
    submit: (
      owner: string,
      repo: string,
      number: number,
      payload: SubmitCommentsPayload,
    ) => Promise<SubmitResult>;
  };
  settings: {
    get: () => Promise<AppSettings>;
    save: (settings: AppSettings) => Promise<AppSettings>;
  };
  locale: {
    get: () => Promise<Locale>;
    set: (locale: Locale) => Promise<void>;
  };
  openExternal: (url: string) => Promise<void>;
}
