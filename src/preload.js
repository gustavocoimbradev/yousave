const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("yousave", {
  download: (payload) => ipcRenderer.invoke("download", payload),
  showInFolder: (filePath) => ipcRenderer.invoke("show-in-folder", filePath),
});
