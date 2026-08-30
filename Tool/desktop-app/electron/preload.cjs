const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jacsRuntime", {
  getApiBaseUrl: () => process.env.JACS_API_URL || "https://jacs-studio.nexoratech.com.vn",
  getMachineInfo: () => ipcRenderer.invoke("runtime:machine-info"),
  readLicense: () => ipcRenderer.invoke("runtime:read-license"),
  saveLicense: (value) => ipcRenderer.invoke("runtime:save-license", value),
  clearLicense: () => ipcRenderer.invoke("runtime:clear-license"),
  getPreferences: () => ipcRenderer.invoke("runtime:get-preferences"),
  savePreferences: (value) => ipcRenderer.invoke("runtime:save-preferences", value),
  getMediaCapabilities: () => ipcRenderer.invoke("runtime:media-capabilities"),
  clearCache: () => ipcRenderer.invoke("runtime:clear-cache"),
  getProviderProfiles: () => ipcRenderer.invoke("runtime:get-providers"),
  saveProviderProfile: (value) => ipcRenderer.invoke("runtime:save-provider", value),
  deleteProviderProfile: (id) => ipcRenderer.invoke("runtime:delete-provider", id),
  testProviderConnection: (id) => ipcRenderer.invoke("runtime:test-provider", id),
  checkForUpdate: (channel) => ipcRenderer.invoke("runtime:check-update", channel),
  downloadUpdate: (release) => ipcRenderer.invoke("runtime:download-update", release),
  openExternal: (url) => ipcRenderer.invoke("runtime:open-external", url),
  cancelOperation: (operationId) => ipcRenderer.invoke("runtime:cancel-operation", operationId),
  pickVideo: () => ipcRenderer.invoke("runtime:pick-video"),
  pickVideos: () => ipcRenderer.invoke("runtime:pick-videos"),
  pickOutputFolder: () => ipcRenderer.invoke("runtime:pick-output-folder"),
  pickAudio: () => ipcRenderer.invoke("runtime:pick-audio"),
  probeVideo: (value) => ipcRenderer.invoke("runtime:probe-video", value),
  downloadVideo: (value, operationId) => ipcRenderer.invoke("runtime:download-video", value, operationId),
  analyzeVideo: (value, providerId, operationId, options) => ipcRenderer.invoke("runtime:analyze-video", value, providerId, operationId, options),
  renderVideo: (value, folder, options, operationId) => ipcRenderer.invoke("runtime:render-video", value, folder, options, operationId),
  readJobs: () => ipcRenderer.invoke("runtime:read-jobs"),
  saveJobs: (value) => ipcRenderer.invoke("runtime:save-jobs", value),
  onDownloadProgress: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on("runtime:download-progress", handler);
    return () => ipcRenderer.removeListener("runtime:download-progress", handler);
  },
  onAnalysisProgress: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on("runtime:analysis-progress", handler);
    return () => ipcRenderer.removeListener("runtime:analysis-progress", handler);
  },
  onRenderProgress: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on("runtime:render-progress", handler);
    return () => ipcRenderer.removeListener("runtime:render-progress", handler);
  },
  onUpdateProgress: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on("runtime:update-progress", handler);
    return () => ipcRenderer.removeListener("runtime:update-progress", handler);
  },
  revealPath: (value) => ipcRenderer.invoke("runtime:reveal-path", value),
  copyText: (value) => ipcRenderer.invoke("runtime:copy-text", value),
});
