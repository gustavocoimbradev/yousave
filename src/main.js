const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { create } = require("youtube-dl-exec");
const ffmpegPath = require("ffmpeg-static");
const { autoUpdater } = require("electron-updater");

function unpacked(p) {
  return app.isPackaged ? p.replace("app.asar", "app.asar.unpacked") : p;
}

const ytDlpBinary = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const ytDlpPath = unpacked(
  path.join(__dirname, "..", "node_modules", "youtube-dl-exec", "bin", ytDlpBinary)
);
const ffmpegBin = unpacked(ffmpegPath);
const ydl = create(ytDlpPath);

const GITHUB_URL = "https://github.com/gustavocoimbradev/";

let currentDownload = null;

// ---------- Persisted settings ----------

function configPath() {
  return path.join(app.getPath("userData"), "config.json");
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf-8"));
  } catch {
    return {};
  }
}

function saveConfig(patch) {
  const cfg = { ...loadConfig(), ...patch };
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2));
  return cfg;
}

function getDownloadDir() {
  const cfg = loadConfig();
  if (cfg.downloadDir && fs.existsSync(cfg.downloadDir)) return cfg.downloadDir;
  return app.getPath("downloads");
}

// ---------- Window ----------

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 374,
    resizable: false,
    frame: false,
    backgroundColor: "#fcfcfd",
    icon: path.join(__dirname, "..", "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.webContents.once("did-finish-load", () => {
    if (!app.isPackaged) {
      resolveBoot();
      return;
    }
    setTimeout(resolveBoot, BOOT_TIMEOUT_MS);
    autoUpdater.checkForUpdates().catch(resolveBoot);
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---------- Auto update ----------

const BOOT_TIMEOUT_MS = 6000;

let bootResolved = false;
let updateAvailable = false;

function resolveBoot() {
  if (bootResolved) return;
  bootResolved = true;
  mainWindow?.webContents.send("boot-status", { ready: true });
}

function sendUpdateStatus(payload) {
  mainWindow?.webContents.send("update-status", payload);
}

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;

autoUpdater.on("update-available", (info) => {
  updateAvailable = true;
  bootResolved = true; // keep the boot splash covering the app; the update dialog takes over
  sendUpdateStatus({ state: "available", version: info.version });
});

autoUpdater.on("update-not-available", () => {
  resolveBoot();
});

autoUpdater.on("download-progress", (progress) => {
  mainWindow?.webContents.send("update-progress", { percent: progress.percent });
});

autoUpdater.on("update-downloaded", () => {
  sendUpdateStatus({ state: "downloaded" });
  setTimeout(() => autoUpdater.quitAndInstall(true, true), 1500);
});

autoUpdater.on("error", (err) => {
  if (updateAvailable) {
    sendUpdateStatus({ state: "error", message: err?.message });
  } else {
    resolveBoot();
  }
});

// ---------- IPC ----------

ipcMain.handle("window-minimize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.handle("window-close", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle("get-settings", () => {
  return { downloadDir: getDownloadDir() };
});

ipcMain.handle("choose-folder", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory", "createDirectory"],
    defaultPath: getDownloadDir(),
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const downloadDir = result.filePaths[0];
  saveConfig({ downloadDir });
  return { canceled: false, downloadDir };
});

ipcMain.handle("cancel-download", () => {
  if (currentDownload) {
    currentDownload.kill();
    return true;
  }
  return false;
});

ipcMain.handle("download", async (event, { url, mp3 }) => {
  const outDir = getDownloadDir();
  const outTmpl = path.join(outDir, "%(title)s.%(ext)s");

  const opts = {
    output: outTmpl,
    ffmpegLocation: ffmpegBin,
    noPlaylist: true,
    print: "after_move:filepath",
    noWarnings: true,
    newline: true,
  };

  if (mp3) {
    opts.extractAudio = true;
    opts.audioFormat = "mp3";
    opts.audioQuality = 0;
    opts.format = "bestaudio/best";
  } else {
    opts.format = "bestvideo+bestaudio/best";
    opts.mergeOutputFormat = "mp4";
  }

  const subprocess = ydl.exec(url, opts);
  currentDownload = subprocess;

  let titleSent = false;

  subprocess.stdout?.on("data", (chunk) => {
    const text = chunk.toString();

    if (!titleSent) {
      const destMatch = text.match(/Destination:\s+(.+)/);
      if (destMatch) {
        titleSent = true;
        const base = path.basename(destMatch[1].trim()).replace(/\.[^.]+$/, "");
        event.sender.send("download-info", { title: base });
      }
    }

    const progressMatch = text.match(
      /\[download]\s+([\d.]+)%(?:\s+of\s+\S+)?(?:\s+at\s+(\S+))?(?:\s+ETA\s+(\S+))?/
    );
    if (progressMatch) {
      event.sender.send("download-progress", {
        percent: parseFloat(progressMatch[1]),
        speed: progressMatch[2] && progressMatch[2] !== "Unknown" ? progressMatch[2] : null,
      });
    }
  });

  try {
    const { stdout } = await subprocess;
    currentDownload = null;
    const filePath = stdout.trim().split("\n").filter(Boolean).pop();
    return { ok: true, filePath, folder: path.dirname(filePath) };
  } catch (err) {
    currentDownload = null;
    if (err.killed || err.signalCode) {
      return { ok: false, canceled: true, error: "Download cancelado." };
    }
    return { ok: false, error: err.shortMessage || err.message };
  }
});

ipcMain.handle("open-file", (_event, filePath) => {
  shell.openPath(filePath);
});

ipcMain.handle("open-external", (_event, url) => {
  if (url === GITHUB_URL) shell.openExternal(url);
});
