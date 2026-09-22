const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const { create } = require("youtube-dl-exec");
const ffmpegPath = require("ffmpeg-static");

function unpacked(p) {
  return app.isPackaged ? p.replace("app.asar", "app.asar.unpacked") : p;
}

const ytDlpBinary = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const ytDlpPath = unpacked(
  path.join(__dirname, "..", "node_modules", "youtube-dl-exec", "bin", ytDlpBinary)
);
const ffmpegBin = unpacked(ffmpegPath);
const ydl = create(ytDlpPath);

function createWindow() {
  const win = new BrowserWindow({
    width: 460,
    height: 440,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("download", async (_event, { url, mp3 }) => {
  const outDir = app.getPath("downloads");
  const outTmpl = path.join(outDir, "%(title)s.%(ext)s");

  const opts = {
    output: outTmpl,
    ffmpegLocation: ffmpegBin,
    noPlaylist: true,
    print: "after_move:filepath",
    noWarnings: true,
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

  try {
    const { stdout } = await ydl.exec(url, opts);
    const filePath = stdout.trim().split("\n").filter(Boolean).pop();
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, error: err.shortMessage || err.message };
  }
});

ipcMain.handle("show-in-folder", (_event, filePath) => {
  shell.showItemInFolder(filePath);
});
