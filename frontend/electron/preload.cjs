const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("onionManager", {
  readSnapshot: () => ipcRenderer.invoke("onion-manager:read-snapshot"),
  run: () => ipcRenderer.invoke("onion-manager:run"),
  onOutput: (callback) => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on("onion-manager:output", listener);
    return () => ipcRenderer.removeListener("onion-manager:output", listener);
  },
});
