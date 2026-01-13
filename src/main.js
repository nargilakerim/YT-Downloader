const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage } = require('electron');
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
let tray;

// yt-dlp and ffmpeg paths - check AppData folder first, then user's bin, then system PATH
const fs = require('fs');
const https = require('https');

const APP_VERSION = '1.2.7';
const GITHUB_REPO = 'nargilakerim/YT-Downloader';

// Primary: AppData folder (recommended)
const appDataDir = path.join(process.env.APPDATA || '', 'youtube-indirici', 'bin');
const appDataYtDlp = path.join(appDataDir, 'yt-dlp.exe');
const appDataFfmpeg = path.join(appDataDir, 'ffmpeg.exe');

// Fallback: User's bin folder
const userBinDir = path.join(process.env.USERPROFILE || process.env.HOME, 'bin');
const userYtDlp = path.join(userBinDir, 'yt-dlp.exe');
const userFfmpeg = path.join(userBinDir, 'ffmpeg.exe');

// Determine which path to use
let ytdlpPath = 'yt-dlp';
let ffmpegPath = null;

if (fs.existsSync(appDataYtDlp)) {
  ytdlpPath = appDataYtDlp;
  ffmpegPath = fs.existsSync(appDataFfmpeg) ? appDataDir : null;
} else if (fs.existsSync(userYtDlp)) {
  ytdlpPath = userYtDlp;
  ffmpegPath = fs.existsSync(userFfmpeg) ? userBinDir : null;
}

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
        // Audio only: extract audio and convert to mp3
        args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
      } else if (type === 'video') {
        // Video: prefer mp4/m4a, fallback to any format with merge
        if (quality === 'best') {
          args.push('-f', 'bestvideo+bestaudio/best');
        } else {
          args.push('-f', `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best`);
        }
        // Force output to mp4 format
        args.push('--merge-output-format', 'mp4');
        // Ensure proper encoding
        args.push('--postprocessor-args', 'ffmpeg:-c:v copy -c:a aac');
      }

      args.push(url);

      // Spawn with UTF-8 encoding for Turkish character support
      this.currentProcess = spawn(ytdlpPath, args, {
        shell: false,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      // Set encoding to UTF-8 for proper Turkish character handling
      this.currentProcess.stdout.setEncoding('utf8');
      this.currentProcess.stderr.setEncoding('utf8');

      let lastProgress = 0;
      let outputFile = '';

      this.currentProcess.stdout.on('data', (data) => {
        const output = data; // Already UTF-8 string due to setEncoding

        // Parse progress: 50.5% of 100.00MiB at 2.50MiB/s ETA 00:20
        const progressMatch = output.match(/(\d+\.?\d*)%/);
        const speedMatch = output.match(/at\s+(\d+\.?\d*)(Ki?B|Mi?B|Gi?B)\/s/i);
        const etaMatch = output.match(/ETA\s+(\d{2}:\d{2}(?::\d{2})?)/);

        if (progressMatch) {
          const progress = parseFloat(progressMatch[1]);
          if (progress !== lastProgress) {
            lastProgress = progress;

            // Build enhanced progress data
            const progressData = {
              percent: progress,
              title: title,
              speed: null,
              eta: null
            };

            // Parse speed
            if (speedMatch) {
              let speed = parseFloat(speedMatch[1]);
              const unit = speedMatch[2].toUpperCase();
              // Convert to MB/s
              if (unit.startsWith('K')) speed /= 1024;
              if (unit.startsWith('G')) speed *= 1024;
              progressData.speed = speed.toFixed(2);
            }

            // Parse ETA
            if (etaMatch) {
              progressData.eta = etaMatch[1];
            }

            this.emit('progress', progressData);
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
        console.error('yt-dlp stderr:', data); // Already UTF-8 string
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

  // Minimize to tray on close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
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

  // Create system tray
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('YouTube İndirici');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Göster', click: () => mainWindow.show() },
    { type: 'separator' },
    {
      label: 'Çıkış', click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.show();
  });

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

// Get app version
ipcMain.handle('get-app-version', () => {
  return APP_VERSION;
});

// Get yt-dlp path info
ipcMain.handle('get-ytdlp-path', () => {
  return {
    path: ytdlpPath,
    appDataDir: appDataDir,
    isSystemPath: ytdlpPath === 'yt-dlp'
  };
});

// Check for app updates from GitHub
ipcMain.handle('check-for-updates', () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      headers: { 'User-Agent': 'YouTubeIndirici' }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const latestVersion = release.tag_name?.replace('v', '') || '0.0.0';
          const hasUpdate = compareVersions(latestVersion, APP_VERSION) > 0;

          // Find Setup.exe asset URL
          let setupUrl = null;
          if (release.assets && release.assets.length > 0) {
            const setupAsset = release.assets.find(a =>
              a.name.toLowerCase().includes('setup') && a.name.endsWith('.exe')
            );
            if (setupAsset) {
              setupUrl = setupAsset.browser_download_url;
            }
          }

          resolve({
            hasUpdate,
            currentVersion: APP_VERSION,
            latestVersion,
            downloadUrl: release.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
            setupUrl: setupUrl, // Direct download URL for Setup.exe
            releaseNotes: release.body || ''
          });
        } catch (e) {
          resolve({ hasUpdate: false, currentVersion: APP_VERSION, error: e.message });
        }
      });
    }).on('error', (e) => {
      resolve({ hasUpdate: false, currentVersion: APP_VERSION, error: e.message });
    });
  });
});

// Version comparison helper
function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

// Download and install update
ipcMain.handle('download-and-install-update', async (event, setupUrl) => {
  return new Promise((resolve) => {
    if (!setupUrl) {
      resolve({ success: false, error: 'Setup URL bulunamadı' });
      return;
    }

    // Download to temp folder
    const tempDir = app.getPath('temp');
    const setupPath = path.join(tempDir, 'YouTubeIndirici-Update-Setup.exe');

    const file = fs.createWriteStream(setupPath);
    let totalBytes = 0;
    let downloadedBytes = 0;

    const download = (url) => {
      const protocol = url.startsWith('https') ? https : require('http');

      protocol.get(url, (response) => {
        // Handle redirect
        if (response.statusCode === 302 || response.statusCode === 301) {
          download(response.headers.location);
          return;
        }

        totalBytes = parseInt(response.headers['content-length'], 10) || 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0) {
            const percent = Math.round((downloadedBytes / totalBytes) * 100);
            mainWindow.webContents.send('update-download-progress', { percent, downloadedBytes, totalBytes });
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();

          // Run the installer and quit the app
          const { exec } = require('child_process');
          exec(`"${setupPath}"`, (error) => {
            if (error) {
              resolve({ success: false, error: error.message });
            }
          });

          // Quit after short delay to let installer start
          setTimeout(() => {
            app.quit();
          }, 1000);

          resolve({ success: true, path: setupPath });
        });
      }).on('error', (e) => {
        fs.unlink(setupPath, () => { });
        resolve({ success: false, error: e.message });
      });
    };

    download(setupUrl);
  });
});

// Download yt-dlp to AppData
ipcMain.handle('download-ytdlp', async () => {
  return new Promise((resolve) => {
    // Create AppData bin directory if not exists
    if (!fs.existsSync(appDataDir)) {
      fs.mkdirSync(appDataDir, { recursive: true });
    }

    const ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    const destPath = path.join(appDataDir, 'yt-dlp.exe');

    const file = fs.createWriteStream(destPath);

    const download = (url) => {
      https.get(url, (response) => {
        // Handle redirect
        if (response.statusCode === 302 || response.statusCode === 301) {
          download(response.headers.location);
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          // Update ytdlpPath to use the new location
          ytdlpPath = destPath;
          resolve({ success: true, path: destPath });
        });
      }).on('error', (e) => {
        fs.unlink(destPath, () => { });
        resolve({ success: false, error: e.message });
      });
    };

    download(ytdlpUrl);
  });
});

// Open external URL
ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

