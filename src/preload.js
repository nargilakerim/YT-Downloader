const { contextBridge, ipcRenderer } = require('electron');

// Renderer process için güvenli API köprüsü
contextBridge.exposeInMainWorld('electronAPI', {
  // Pencere kontrolleri
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Tema
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),

  // Ayarlar ve Dosya Sistemi
  getStoreValue: (key) => ipcRenderer.invoke('get-store-value', key),
  setStoreValue: (key, value) => ipcRenderer.invoke('set-store-value', key, value),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Video / Medya işlemleri
  getVideoInfo: (url) => ipcRenderer.invoke('get-video-info', url),
  startDownload: (options) => ipcRenderer.invoke('start-download', options),
  cancelDownload: () => ipcRenderer.invoke('cancel-download'),

  // İndirme olayları
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, progress) => callback(progress));
  },
  onDownloadComplete: (callback) => {
    ipcRenderer.on('download-complete', (event, result) => callback(result));
  },
  onDownloadError: (callback) => {
    ipcRenderer.on('download-error', (event, error) => callback(error));
  },

  // Geçmiş
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  deleteHistoryItem: (id) => ipcRenderer.invoke('delete-history-item', id),

  // Dosya işlemleri
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  openFolder: (filePath) => ipcRenderer.invoke('open-folder', filePath),

  // Motor durumları (yt-dlp ve ffmpeg)
  checkEngines: () => ipcRenderer.invoke('check-engines'),
  checkYtDlp: () => ipcRenderer.invoke('check-ytdlp'),
  downloadYtDlp: () => ipcRenderer.invoke('download-ytdlp'),
  downloadFFmpeg: () => ipcRenderer.invoke('download-ffmpeg'),
  onFFmpegProgress: (callback) => {
    ipcRenderer.on('ffmpeg-download-progress', (event, progress) => callback(progress));
  },
  getEnginePaths: () => ipcRenderer.invoke('get-engine-paths'),
  getYtDlpPath: () => ipcRenderer.invoke('get-ytdlp-path'),

  // Uygulama güncelleme
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadAndInstallUpdate: (setupUrl) => ipcRenderer.invoke('download-and-install-update', setupUrl),
  onUpdateDownloadProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (event, progress) => callback(progress));
  },
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
