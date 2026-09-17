const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("onionManager", {
  getTheme: () => ipcRenderer.invoke("onion-manager:get-theme"),
  saveTheme: (darkMode) => ipcRenderer.invoke("onion-manager:save-theme", darkMode),
  getCollectionSettings: () => ipcRenderer.invoke("onion-manager:get-collection-settings"),
  saveCollectionSettings: (settings) => ipcRenderer.invoke("onion-manager:save-collection-settings", settings),
  readSnapshot: () => ipcRenderer.invoke("onion-manager:read-snapshot"),
  run: () => ipcRenderer.invoke("onion-manager:run"),
  onOutput: (callback) => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on("onion-manager:output", listener);
    return () => ipcRenderer.removeListener("onion-manager:output", listener);
  },
});
