import type { DesktopApi } from "@/lib/ipc/contract";

declare global {
  interface Window {
    /** IPC bridge exposed by the Electron preload script. */
    api: DesktopApi;
  }
}

export {};
