const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const Store = require('electron-store');
const { spawn, exec } = require('child_process');
const { EventEmitter } = require('events');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let store;
let mainWindow;

// yt-dlp and ffmpeg paths - check user's bin folder first, then system PATH
const fs = require('fs');
const userBinDir = path.join(process.env.USERPROFILE || process.env.HOME, 'bin');
const userYtDlp = path.join(userBinDir, 'yt-dlp.exe');
const userFfmpeg = path.join(userBinDir, 'ffmpeg.exe');
const ytdlpPath = fs.existsSync(userYtDlp) ? userYtDlp : 'yt-dlp';
const ffmpegPath = fs.existsSync(userFfmpeg) ? userBinDir : null;

// Download Manager Class
class DownloadManager extends EventEmitter {
  constructor() {
    super();
    this.currentProcess = null;
    this.isDownloading = false;
  }

  async checkYtDlp() {
    return new Promise((resolve) => {
      exec(`"${ytdlpPath}" --version`, (error, stdout) => {
        if (error) {
          resolve({ installed: false, version: null });
        } else {
          resolve({ installed: true, version: stdout.trim() });
        }
      });
    });
  }

  async getVideoInfo(url) {
    return new Promise((resolve, reject) => {
      const args = ['--js-runtimes', 'nodejs', '--dump-json', '--no-download', '--flat-playlist', url];
      let output = '';
      let errorOutput = '';

      const process = spawn(ytdlpPath, args, { shell: true });

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(errorOutput || 'Video bilgisi alinamadi'));
          return;
        }

        try {
          const lines = output.trim().split('\n');
          const items = lines.map(line => JSON.parse(line));

          if (items.length === 1) {
            const info = items[0];
            resolve({
              isPlaylist: false,
              id: info.id,
              title: info.title,
              thumbnail: info.thumbnail || info.thumbnails?.[info.thumbnails.length - 1]?.url,
              duration: info.duration,
              uploader: info.uploader || info.channel,
              viewCount: info.view_count,
              url: url
            });
          } else {
            resolve({
              isPlaylist: true,
              title: items[0].playlist_title || 'Playlist',
              thumbnail: items[0].thumbnails?.[0]?.url,
              itemCount: items.length,
              items: items.map(item => ({
                id: item.id,
                title: item.title,
                thumbnail: item.thumbnails?.[item.thumbnails?.length - 1]?.url,
                duration: item.duration,
                url: item.url || item.webpage_url
              })),
              url: url
            });
          }
        } catch (e) {
          reject(new Error('JSON parse hatasi: ' + e.message));
        }
      });
    });
  }

  async download(options) {
    if (this.isDownloading) {
      throw new Error('Zaten bir indirme devam ediyor');
    }

    this.isDownloading = true;
    const { url, type, quality, outputPath, title } = options;

    return new Promise((resolve, reject) => {
      let args = [
        '--js-runtimes', 'nodejs',
        '--newline',
        '--progress',
        '-o', path.join(outputPath, '%(title)s.%(ext)s')
      ];

      // Add ffmpeg location if available
      if (ffmpegPath) {
        args.unshift('--ffmpeg-location', ffmpegPath);
      }

      if (type === 'audio') {
        args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
      } else if (type === 'video') {
        if (quality === 'best') {
          args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
        } else {
          args.push('-f', `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${quality}][ext=mp4]/best`);
        }
        args.push('--merge-output-format', 'mp4');
      }

      args.push(url);

      this.currentProcess = spawn(ytdlpPath, args, { shell: false });

      let lastProgress = 0;
      let outputFile = '';

      this.currentProcess.stdout.on('data', (data) => {
        const output = data.toString();

        const progressMatch = output.match(/(\d+\.?\d*)%/);
        if (progressMatch) {
          const progress = parseFloat(progressMatch[1]);
          if (progress !== lastProgress) {
            lastProgress = progress;
            this.emit('progress', { percent: progress, title: title });
          }
        }

        const destMatch = output.match(/\[download\] Destination: (.+)/);
        if (destMatch) {
          outputFile = destMatch[1].trim();
        }

        const mergeMatch = output.match(/\[Merger\] Merging formats into "(.+)"/);
        if (mergeMatch) {
          outputFile = mergeMatch[1].trim();
        }

        const extractMatch = output.match(/\[ExtractAudio\] Destination: (.+)/);
        if (extractMatch) {
          outputFile = extractMatch[1].trim();
        }
      });

      this.currentProcess.stderr.on('data', (data) => {
        console.error('yt-dlp stderr:', data.toString());
      });

      this.currentProcess.on('close', (code) => {
        this.isDownloading = false;
        this.currentProcess = null;

        if (code === 0) {
          this.emit('complete', { success: true, filePath: outputFile || outputPath });
          resolve({ success: true, filePath: outputFile });
        } else {
          const error = new Error('Indirme basarisiz oldu');
          this.emit('error', error.message);
          reject(error);
        }
      });

      this.currentProcess.on('error', (error) => {
        this.isDownloading = false;
        this.currentProcess = null;
        this.emit('error', error.message);
        reject(error);
      });
    });
  }

  cancel() {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.isDownloading = false;
      this.currentProcess = null;
      this.emit('cancelled');
    }
  }
}

let downloadManager;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Dev tools only in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

app.whenReady().then(() => {
  // Initialize store
  store = new Store({
    defaults: {
      theme: 'dark',
      downloadPath: app.getPath('downloads'),
      history: []
    }
  });

  downloadManager = new DownloadManager();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============ IPC HANDLERS ============

// Window controls
ipcMain.on('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  app.quit();
});

// Theme
ipcMain.handle('get-theme', () => {
  return store.get('theme');
});

ipcMain.handle('set-theme', (event, theme) => {
  store.set('theme', theme);
  return theme;
});

// Store operations
ipcMain.handle('get-store-value', (event, key) => {
  return store.get(key);
});

ipcMain.handle('set-store-value', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Klasör Seçin'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Video info
ipcMain.handle('get-video-info', async (event, url) => {
  try {
    const info = await downloadManager.getVideoInfo(url);
    return { success: true, data: info };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Download
ipcMain.handle('start-download', async (event, options) => {
  try {
    const downloadPath = options.outputPath || store.get('downloadPath');

    downloadManager.on('progress', (progress) => {
      mainWindow.webContents.send('download-progress', progress);
    });

    downloadManager.on('complete', (result) => {
      const history = store.get('history') || [];
      history.unshift({
        id: Date.now(),
        title: options.title,
        thumbnail: options.thumbnail,
        url: options.url,
        type: options.type,
        quality: options.quality,
        date: new Date().toISOString(),
        filePath: result.filePath
      });
      store.set('history', history.slice(0, 100));

      mainWindow.webContents.send('download-complete', result);
    });

    downloadManager.on('error', (error) => {
      mainWindow.webContents.send('download-error', error);
    });

    await downloadManager.download({
      ...options,
      outputPath: downloadPath
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cancel-download', () => {
  downloadManager.cancel();
  return { success: true };
});

// History
ipcMain.handle('get-history', () => {
  return store.get('history') || [];
});

ipcMain.handle('clear-history', () => {
  store.set('history', []);
  return { success: true };
});

ipcMain.handle('delete-history-item', (event, id) => {
  const history = store.get('history') || [];
  const newHistory = history.filter(item => item.id !== id);
  store.set('history', newHistory);
  return { success: true };
});

// File operations
ipcMain.handle('open-file', (event, filePath) => {
  shell.openPath(filePath);
});

ipcMain.handle('open-folder', (event, filePath) => {
  shell.showItemInFolder(filePath);
});

// yt-dlp check
ipcMain.handle('check-ytdlp', async () => {
  return await downloadManager.checkYtDlp();
});
