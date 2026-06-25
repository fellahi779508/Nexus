const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  saveDatabaseFile: (tempPath) =>
    ipcRenderer.invoke("save-database-file", tempPath),
});
