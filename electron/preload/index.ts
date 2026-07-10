import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import {
  IPC,
  reviewProgressChannel,
  type DesktopApi,
  type ReviewRunHandlers,
  type ReviewRunResult,
} from "@/lib/ipc/contract";

const api: DesktopApi = {
  auth: {
    status: () => ipcRenderer.invoke(IPC.authStatus),
  },
  owners: {
    list: () => ipcRenderer.invoke(IPC.ownersList),
  },
  repos: {
    list: (owner) => ipcRenderer.invoke(IPC.reposList, owner),
  },
  pulls: {
    list: (owner, repo) => ipcRenderer.invoke(IPC.pullsList, owner, repo),
    detail: (owner, repo, number) => ipcRenderer.invoke(IPC.pullDetail, owner, repo, number),
  },
  review: {
    run: (owner, repo, number, handlers: ReviewRunHandlers) => {
      const runId = crypto.randomUUID();
      const channel = reviewProgressChannel(runId);
      const onProgress = (_e: IpcRendererEvent, payload: unknown) =>
        handlers.onProgress?.(payload as never);

      ipcRenderer.on(channel, onProgress);

      ipcRenderer
        .invoke(IPC.reviewRun, { runId, owner, repo, number })
        .then((result: ReviewRunResult) => {
          if (result.ok) handlers.onSession?.(result.session);
          else handlers.onError?.(result.error);
        })
        .catch((error: unknown) => {
          handlers.onError?.(error instanceof Error ? error.message : String(error));
        })
        .finally(() => {
          ipcRenderer.removeListener(channel, onProgress);
        });

      return {
        cancel: () => ipcRenderer.send(IPC.reviewCancel, runId),
      };
    },
    submit: (owner, repo, number, payload) =>
      ipcRenderer.invoke(IPC.reviewSubmit, owner, repo, number, payload),
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.settingsGet),
    save: (settings) => ipcRenderer.invoke(IPC.settingsSave, settings),
  },
  locale: {
    get: () => ipcRenderer.invoke(IPC.localeGet),
    set: (locale) => ipcRenderer.invoke(IPC.localeSet, locale),
  },
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),
};

contextBridge.exposeInMainWorld("api", api);
