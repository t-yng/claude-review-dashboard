import { ipcMain, shell, type IpcMainInvokeEvent } from "electron";
import { randomUUID } from "node:crypto";
import { getAuthStatus } from "@/lib/github/auth";
import { listOwners, listRepos } from "@/lib/github/repos";
import { listPulls, getPullDetail } from "@/lib/github/pulls";
import { submitReview } from "@/lib/github/reviews";
import { loadSettings, saveSettings } from "@/lib/settings/store";
import { saveSession } from "@/lib/settings/sessions";
import { runReview } from "@/lib/review/engine";
import { reviewItemSchema } from "@/lib/schema/review";
import { GhError } from "@/lib/github/gh";
import { IPC, reviewProgressChannel, type SubmitCommentsPayload } from "@/lib/ipc/contract";
import { getLocale, setLocale } from "./prefs";

/** Normalize any thrown value into a message string for the renderer. */
function toMessage(error: unknown): string {
  if (error instanceof GhError) return error.message;
  return error instanceof Error ? error.message : String(error);
}

/** In-flight review runs, keyed by run id, so they can be cancelled. */
const activeRuns = new Map<string, AbortController>();

/** Register all IPC handlers. Call once after the app is ready. */
export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.authStatus, () => getAuthStatus());
  ipcMain.handle(IPC.ownersList, () => listOwners());
  ipcMain.handle(IPC.reposList, (_e, owner?: string) => listRepos(owner));
  ipcMain.handle(IPC.pullsList, (_e, owner: string, repo: string) => listPulls(owner, repo));
  ipcMain.handle(IPC.pullDetail, (_e, owner: string, repo: string, number: number) =>
    getPullDetail(owner, repo, number),
  );

  ipcMain.handle(IPC.reviewSubmit, async (_e, owner, repo, number, payload: SubmitCommentsPayload) => {
    const items = payload.items.map((raw) => {
      const item = reviewItemSchema.parse(raw);
      return {
        ...item,
        id: item.id ?? randomUUID(),
        status: item.status ?? ("pending" as const),
        side: item.side ?? ("RIGHT" as const),
        codeSnippet: item.codeSnippet ?? "",
      };
    });
    const pr = await getPullDetail(owner, repo, number);
    const headSha = payload.headSha || pr.headRefOid;
    return submitReview(owner, repo, number, headSha, pr.diff, items);
  });

  ipcMain.handle(IPC.settingsGet, () => loadSettings());
  ipcMain.handle(IPC.settingsSave, (_e, settings) => saveSettings(settings));

  ipcMain.handle(IPC.localeGet, () => getLocale());
  ipcMain.handle(IPC.localeSet, (_e, locale) => setLocale(locale));

  ipcMain.handle(IPC.openExternal, (_e, url: string) => shell.openExternal(url));

  // Review runs stream progress back on a per-run channel and resolve with the
  // final session (or an error envelope) when the invoke settles.
  ipcMain.handle(
    IPC.reviewRun,
    async (
      event: IpcMainInvokeEvent,
      { runId, owner, repo, number }: { runId: string; owner: string; repo: string; number: number },
    ) => {
      const controller = new AbortController();
      activeRuns.set(runId, controller);
      const channel = reviewProgressChannel(runId);

      try {
        const [pr, settings] = await Promise.all([
          getPullDetail(owner, repo, number),
          loadSettings(),
        ]);
        const session = await runReview({
          owner,
          repo,
          pr,
          settings,
          abortController: controller,
          onProgress: (p) => {
            if (!event.sender.isDestroyed()) event.sender.send(channel, p);
          },
        });
        await saveSession(session).catch(() => {});
        return { ok: true as const, session };
      } catch (error) {
        return { ok: false as const, error: toMessage(error) };
      } finally {
        activeRuns.delete(runId);
      }
    },
  );

  ipcMain.on(IPC.reviewCancel, (_e, runId: string) => {
    activeRuns.get(runId)?.abort();
  });
}
