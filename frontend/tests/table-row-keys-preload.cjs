const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('onionManager', {
  getTheme: async () => ({ darkMode: false }),
  getCollectionSettings: async () => ({ settings: { automaticCollection: false, collectionIntervalMinutes: 60 }, status: 'inactive', supported: true }),
  readSnapshot: () => ipcRenderer.invoke('test:read-snapshot'),
});
