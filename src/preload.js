const { contextBridge, ipcRenderer } = require('electron');

// Renderer process icin guvenli API
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

    // Video islemleri
    getVideoInfo: (url) => ipcRenderer.invoke('get-video-info', url),
    startDownload: (options) => ipcRenderer.invoke('start-download', options),
    cancelDownload: () => ipcRenderer.invoke('cancel-download'),

    // Indirme olaylari
    onDownloadProgress: (callback) => {
        ipcRenderer.on('download-progress', (event, progress) => callback(progress));
    },
    onDownloadComplete: (callback) => {
        ipcRenderer.on('download-complete', (event, result) => callback(result));
    },
    onDownloadError: (callback) => {
        ipcRenderer.on('download-error', (event, error) => callback(error));
    },

    // Gecmis
    getHistory: () => ipcRenderer.invoke('get-history'),
    clearHistory: () => ipcRenderer.invoke('clear-history'),
    deleteHistoryItem: (id) => ipcRenderer.invoke('delete-history-item', id),

    // Dosya islemleri
    openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
    openFolder: (filePath) => ipcRenderer.invoke('open-folder', filePath),

    // yt-dlp kontrolu ve indirme
    checkYtDlp: () => ipcRenderer.invoke('check-ytdlp'),
    downloadYtDlp: () => ipcRenderer.invoke('download-ytdlp'),
    getYtDlpPath: () => ipcRenderer.invoke('get-ytdlp-path'),

    // Uygulama guncelleme
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadAndInstallUpdate: (setupUrl) => ipcRenderer.invoke('download-and-install-update', setupUrl),
    onUpdateDownloadProgress: (callback) => {
        ipcRenderer.on('update-download-progress', (event, progress) => callback(progress));
    },
    openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
