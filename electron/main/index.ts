import { app, BrowserWindow, shell } from "electron";
import { join } from "node:path";
import { registerIpcHandlers } from "./ipc";
import { fixPath } from "./fix-path";

// GUI launches don't inherit the shell PATH, so resolve it before any child
// process (gh, the Claude agent SDK, …) is spawned.
fixPath();

/** Whether electron-vite is serving the renderer over its dev server. */
const devServerUrl = process.env["ELECTRON_RENDERER_URL"];

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: "#0a0a0b",
    title: "Claude Review Dashboard",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      sandbox: false,
    },
  });

  win.once("ready-to-show", () => win.show());

  // Route target="_blank" / window.open and external links to the OS browser
  // instead of spawning Electron child windows.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  if (devServerUrl) {
    win.loadURL(devServerUrl);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
