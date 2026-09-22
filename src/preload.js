const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("yousave", {
  download: (payload) => ipcRenderer.invoke("download", payload),
  cancelDownload: () => ipcRenderer.invoke("cancel-download"),
  showInFolder: (filePath) => ipcRenderer.invoke("show-in-folder", filePath),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  chooseFolder: () => ipcRenderer.invoke("choose-folder"),
  minimize: () => ipcRenderer.invoke("window-minimize"),
  close: () => ipcRenderer.invoke("window-close"),
  onDownloadInfo: (cb) => ipcRenderer.on("download-info", (_e, data) => cb(data)),
  onDownloadProgress: (cb) => ipcRenderer.on("download-progress", (_e, data) => cb(data)),
  onUpdateStatus: (cb) => ipcRenderer.on("update-status", (_e, data) => cb(data)),
  onUpdateProgress: (cb) => ipcRenderer.on("update-progress", (_e, data) => cb(data)),
});
