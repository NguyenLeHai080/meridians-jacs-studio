const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jacsRuntime", {
  getApiBaseUrl: () => process.env.JACS_API_URL || "https://jacs-studio.nexoratech.com.vn",
  getMachineInfo: () => ipcRenderer.invoke("runtime:machine-info"),
  readLicense: () => ipcRenderer.invoke("runtime:read-license"),
  saveLicense: (value) => ipcRenderer.invoke("runtime:save-license", value),
  clearLicense: () => ipcRenderer.invoke("runtime:clear-license"),
  getPreferences: () => ipcRenderer.invoke("runtime:get-preferences"),
  savePreferences: (value) => ipcRenderer.invoke("runtime:save-preferences", value),
  pickVideo: () => ipcRenderer.invoke("runtime:pick-video"),
  revealPath: (value) => ipcRenderer.invoke("runtime:reveal-path", value),
});
