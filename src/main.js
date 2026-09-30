const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const Store = require('electron-store');
const { spawn, exec } = require('child_process');
const { EventEmitter } = require('events');
const fs = require('fs');
const https = require('https');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let store;
let mainWindow;

const APP_VERSION = '1.5.1';
const GITHUB_REPO = 'nargilakerim/YT-Downloader';

// Primary: AppData folder
const appDataDir = path.join(process.env.APPDATA || '', 'youtube-indirici', 'bin');
const appDataYtDlp = path.join(appDataDir, 'yt-dlp.exe');
const appDataFfmpeg = path.join(appDataDir, 'ffmpeg.exe');
const appDataFfprobe = path.join(appDataDir, 'ffprobe.exe');

// Fallback: User's bin folder
const userBinDir = path.join(process.env.USERPROFILE || process.env.HOME || '', 'bin');
const userYtDlp = path.join(userBinDir, 'yt-dlp.exe');
const userFfmpeg = path.join(userBinDir, 'ffmpeg.exe');

// Locate tools
function getResolvedPaths() {
  let ytPath = 'yt-dlp';
  let ffDir = null;

  if (fs.existsSync(appDataYtDlp)) {
    ytPath = appDataYtDlp;
  } else if (fs.existsSync(userYtDlp)) {
    ytPath = userYtDlp;
  }

  if (fs.existsSync(appDataFfmpeg)) {
    ffDir = appDataDir;
  } else if (fs.existsSync(userFfmpeg)) {
    ffDir = userBinDir;
  }

  return { ytPath, ffDir };
}

// Download Manager Class
class DownloadManager extends EventEmitter {
  constructor() {
    super();
    this.currentProcess = null;
    this.isDownloading = false;
  }

  async checkEngines() {
    const { ytPath, ffDir } = getResolvedPaths();

    const checkYt = new Promise((resolve) => {
      exec(`"${ytPath}" --version`, (error, stdout) => {
        if (error) {
          resolve({ installed: false, version: null, path: ytPath });
        } else {
          resolve({ installed: true, version: stdout.trim(), path: ytPath });
        }
      });
    });

    const checkFf = new Promise((resolve) => {
      const ffmpegCmd = ffDir ? `"${path.join(ffDir, 'ffmpeg.exe')}"` : 'ffmpeg';
      exec(`${ffmpegCmd} -version`, (error, stdout) => {
        if (error) {
          resolve({ installed: false, version: null, path: ffDir });
        } else {
          const firstLine = stdout.split('\n')[0] || '';
          const match = firstLine.match(/ffmpeg version ([^\s]+)/i);
          const version = match ? match[1] : 'Mevcut';
          resolve({ installed: true, version, path: ffDir || 'Sistem PATH' });
        }
      });
    });

    const [ytdlp, ffmpeg] = await Promise.all([checkYt, checkFf]);
    return { ytdlp, ffmpeg };
  }

  async getVideoInfo(url) {
    const { ytPath } = getResolvedPaths();

    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-download',
        '--flat-playlist',
        '--no-warnings',
        '--extractor-args', 'youtube:player_client=android,web',
        url
      ];
      let output = '';
      let errorOutput = '';

      const proc = spawn(ytPath, args, {
        shell: false,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      proc.stdout.setEncoding('utf8');
      proc.stderr.setEncoding('utf8');

      proc.stdout.on('data', (data) => {
        output += data;
      });

      proc.stderr.on('data', (data) => {
        errorOutput += data;
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          let cleanError = errorOutput.replace(/WARNING:.*\n?/g, '').trim();
          if (cleanError.includes('Sign in to confirm')) {
            cleanError = 'YouTube bot koruması: Lütfen bağlantıyı kontrol edin veya daha sonra tekrar deneyin.';
          } else if (cleanError.includes('Video unavailable')) {
            cleanError = 'Bu video kullanılamıyor veya gizli.';
          } else if (!cleanError) {
            cleanError = 'Medya bilgisi alınamadı. Lütfen bağlantıyı kontrol edin.';
          }
          reject(new Error(cleanError));
          return;
        }

        try {
          const lines = output.trim().split('\n').filter(Boolean);
          const items = lines.map(line => JSON.parse(line));

          if (items.length === 1) {
            const info = items[0];
            let thumbnail = info.thumbnail;
            if (!thumbnail && info.thumbnails && info.thumbnails.length > 0) {
              thumbnail = info.thumbnails[info.thumbnails.length - 1]?.url;
            }
            if (!thumbnail) {
              thumbnail = info.display_url || info.video_url || '';
            }

            resolve({
              isPlaylist: false,
              id: info.id,
              title: info.title || info.description?.substring(0, 50) || 'Medya Dosyası',
              thumbnail: thumbnail,
              duration: info.duration,
              uploader: info.uploader || info.channel || info.uploader_id || '',
              viewCount: info.view_count,
              extractor: info.extractor_key || info.extractor || '',
              url: url
            });
          } else {
            resolve({
              isPlaylist: true,
              title: items[0].playlist_title || 'Çalma Listesi',
              thumbnail: items[0].thumbnails?.[0]?.url || items[0].thumbnail,
              itemCount: items.length,
              items: items.map(item => ({
                id: item.id,
                title: item.title,
                thumbnail: item.thumbnails?.[item.thumbnails?.length - 1]?.url || item.thumbnail,
                duration: item.duration,
                url: item.url || item.webpage_url
              })),
              url: url
            });
          }
        } catch (e) {
          reject(new Error('Medya bilgisi işlenirken hata oluştu: ' + e.message));
        }
      });

      proc.on('error', (err) => {
        reject(new Error('yt-dlp başlatılamadı: ' + err.message));
      });
    });
  }

  async download(options) {
    if (this.isDownloading) {
      throw new Error('Şu anda devam eden bir indirme var. Lütfen bitmesini bekleyin veya iptal edin.');
    }

    const { ytPath, ffDir } = getResolvedPaths();
    const { url, type, quality, outputPath, title, customFilename } = options;

    // Check if FFmpeg is required
    const requiresFfmpeg = type === 'audio' || quality === 'best' || (typeof quality === 'number' && quality > 720);
    if (requiresFfmpeg && !ffDir) {
      // Check if ffmpeg exists in PATH as fallback
      const hasSystemFfmpeg = await new Promise((res) => {
        exec('ffmpeg -version', (err) => res(!err));
      });
      if (!hasSystemFfmpeg) {
        throw new Error('MP3 veya yüksek kaliteli video indirmek için FFmpeg gereklidir. Lütfen Ayarlar sayfasından "FFmpeg Otomatik İndir" butonuna tıklayın.');
      }
    }

    this.isDownloading = true;

    return new Promise((resolve, reject) => {
      let outputTemplate;
      if (customFilename && customFilename.trim()) {
        let safeName = customFilename.trim()
          .replace(/İ/g, 'I').replace(/ı/g, 'i')
          .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
          .replace(/Ü/g, 'U').replace(/ü/g, 'u')
          .replace(/Ş/g, 'S').replace(/ş/g, 's')
          .replace(/Ö/g, 'O').replace(/ö/g, 'o')
          .replace(/Ç/g, 'C').replace(/ç/g, 'c')
          .replace(/[<>:"/\\|?*]/g, '_');
        outputTemplate = path.join(outputPath, `${safeName}.%(ext)s`);
      } else {
        outputTemplate = path.join(outputPath, '%(title)s.%(ext)s');
      }

      const args = [
        '--newline',
        '--progress',
        '--windows-filenames',
        '--no-warnings',
        '--extractor-args', 'youtube:player_client=android,web',
        '-o', outputTemplate
      ];

      if (ffDir) {
        args.push('--ffmpeg-location');
        args.push(ffDir);
      }

      if (type === 'audio') {
        args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0', '--embed-thumbnail');
      } else {
        // Video Kalite Seçimi (FFmpeg ile birleştirme)
        if (quality === 'best' || !quality) {
          args.push('-f', 'bestvideo+bestaudio/best');
        } else {
          const maxHg = parseInt(quality, 10);
          if (!isNaN(maxHg)) {
            args.push('-f', `bestvideo[height<=${maxHg}]+bestaudio/best[height<=${maxHg}]/best`);
          } else {
            args.push('-f', 'bestvideo+bestaudio/best');
          }
        }
        args.push('--merge-output-format', 'mp4');
        args.push('--no-keep-video');
      }

      args.push(url);

      this.currentProcess = spawn(ytPath, args, {
        shell: false,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      this.currentProcess.stdout.setEncoding('utf8');
      this.currentProcess.stderr.setEncoding('utf8');

      let lastProgress = 0;
      let outputFile = '';
      let errorDetails = '';

      this.currentProcess.stdout.on('data', (output) => {
        const progressMatch = output.match(/(\d+\.?\d*)%/);
        const speedMatch = output.match(/at\s+(\d+\.?\d*)(Ki?B|Mi?B|Gi?B)\/s/i);
        const etaMatch = output.match(/ETA\s+(\d{2}:\d{2}(?::\d{2})?)/);

        if (progressMatch) {
          const progress = parseFloat(progressMatch[1]);
          if (progress !== lastProgress) {
            lastProgress = progress;
            const progressData = {
              percent: progress,
              title: title,
              speed: null,
              eta: null
            };

            if (speedMatch) {
              let speed = parseFloat(speedMatch[1]);
              const unit = speedMatch[2].toUpperCase();
              if (unit.startsWith('K')) speed /= 1024;
              if (unit.startsWith('G')) speed *= 1024;
              progressData.speed = speed.toFixed(2);
            }

            if (etaMatch) {
              progressData.eta = etaMatch[1];
            }

            this.emit('progress', progressData);
          }
        }

        const destMatch = output.match(/\[download\] Destination: (.+)/);
        if (destMatch) outputFile = destMatch[1].trim();

        const mergeMatch = output.match(/\[Merger\] Merging formats into "(.+)"/);
        if (mergeMatch) outputFile = mergeMatch[1].trim();

        const extractMatch = output.match(/\[ExtractAudio\] Destination: (.+)/);
        if (extractMatch) outputFile = extractMatch[1].trim();
      });

      this.currentProcess.stderr.on('data', (data) => {
        errorDetails += data;
      });

      this.currentProcess.on('close', (code) => {
        this.isDownloading = false;
        this.currentProcess = null;

        if (code === 0) {
          const finalPath = outputFile || outputPath;
          this.emit('complete', { success: true, filePath: finalPath });
          resolve({ success: true, filePath: finalPath });
        } else {
          let cleanErr = errorDetails.replace(/WARNING:.*\n?/g, '').trim();
          if (cleanErr.includes('ffprobe and ffmpeg not found')) {
            cleanErr = 'FFmpeg bulunamadı! Lütfen Ayarlar sayfasından FFmpeg otomatik yüklemesini yapın.';
          } else if (cleanErr.includes('Sign in to confirm')) {
            cleanErr = 'YouTube bot doğrulaması talep etti. Lütfen birkaç dakika sonra tekrar deneyin.';
          } else if (!cleanErr) {
            cleanErr = 'İndirme işlemi başarısız oldu (Hata kodu: ' + code + ')';
          }
          const error = new Error(cleanErr);
          this.emit('error', cleanErr);
          reject(error);
        }
      });

      this.currentProcess.on('error', (err) => {
        this.isDownloading = false;
        this.currentProcess = null;
        this.emit('error', err.message);
        reject(err);
      });
    });
  }

  cancel() {
    if (this.currentProcess) {
      const pid = this.currentProcess.pid;
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${pid} /T /F`, () => { });
      } else {
        this.currentProcess.kill('SIGTERM');
      }
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
    height: 820,
    minWidth: 920,
    minHeight: 650,
    frame: false,
    title: 'Media Downloader',
    backgroundColor: '#0d0e12',
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

app.whenReady().then(() => {
  // Ensure bin directory exists
  if (!fs.existsSync(appDataDir)) {
    try {
      fs.mkdirSync(appDataDir, { recursive: true });
    } catch (e) {
      console.error('Failed to create bin dir:', e);
    }
  }

  // Initialize store
  store = new Store({
    defaults: {
      theme: 'dark',
      downloadPath: app.getPath('downloads'),
      videoPath: app.getPath('downloads'),
      audioPath: app.getPath('downloads'),
      history: [],
      stats: { total: 0, videos: 0, audios: 0 }
    }
  });

  downloadManager = new DownloadManager();

  // ATTACH LISTENERS ONCE - FIXES MEMORY LEAK & REPEATED NOTIFICATIONS
  downloadManager.on('progress', (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress', progress);
    }
  });

  downloadManager.on('complete', (result) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-complete', result);
    }
  });

  downloadManager.on('error', (errorMsg) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-error', errorMsg);
    }
  });

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
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
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
ipcMain.handle('get-theme', () => store.get('theme'));
ipcMain.handle('set-theme', (event, theme) => {
  store.set('theme', theme);
  return theme;
});

// Store operations
ipcMain.handle('get-store-value', (event, key) => store.get(key));
ipcMain.handle('set-store-value', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'İndirme Klasörünü Seçin'
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
    const downloadPath = options.outputPath || store.get('downloadPath') || app.getPath('downloads');

    // Start download without re-attaching listeners
    downloadManager.download({
      ...options,
      outputPath: downloadPath
    }).then((result) => {
      // Add to history
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
    }).catch((err) => {
      console.error('Download execution error:', err.message);
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
ipcMain.handle('get-history', () => store.get('history') || []);
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
  if (filePath && fs.existsSync(filePath)) {
    shell.openPath(filePath);
  }
});

ipcMain.handle('open-folder', (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
  } else {
    const defaultFolder = store.get('downloadPath') || app.getPath('downloads');
    shell.openPath(defaultFolder);
  }
});

// Engine status (yt-dlp and ffmpeg)
ipcMain.handle('check-engines', async () => {
  return await downloadManager.checkEngines();
});

// Backward compatibility check-ytdlp
ipcMain.handle('check-ytdlp', async () => {
  const engines = await downloadManager.checkEngines();
  return engines.ytdlp;
});

// Get app version
ipcMain.handle('get-app-version', () => APP_VERSION);

// Get yt-dlp & ffmpeg paths
ipcMain.handle('get-engine-paths', () => {
  const { ytPath, ffDir } = getResolvedPaths();
  return {
    ytDlpPath: ytPath,
    ffmpegPath: ffDir ? path.join(ffDir, 'ffmpeg.exe') : null,
    appDataDir: appDataDir
  };
});

ipcMain.handle('get-ytdlp-path', () => {
  const { ytPath } = getResolvedPaths();
  return {
    path: ytPath,
    appDataDir: appDataDir,
    isSystemPath: ytPath === 'yt-dlp'
  };
});

// Check for app updates from GitHub
ipcMain.handle('check-for-updates', () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      headers: { 'User-Agent': 'MediaDownloader/1.5.1' }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const latestVersion = release.tag_name?.replace('v', '') || '0.0.0';
          const hasUpdate = compareVersions(latestVersion, APP_VERSION) > 0;

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
            setupUrl: setupUrl,
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
// Download and install update
ipcMain.handle('download-and-install-update', async (event, setupUrl) => {
  return new Promise((resolve) => {
    if (!setupUrl) {
      resolve({ success: false, error: 'Setup URL bulunamadı' });
      return;
    }

    const tempDir = app.getPath('temp');
    const setupPath = path.join(tempDir, 'MediaDownloader-Update-Setup.exe');
    const file = fs.createWriteStream(setupPath, { highWaterMark: 1024 * 1024 });

    let totalBytes = 0;
    let downloadedBytes = 0;

    const download = (url) => {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : require('http');

      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: {
          'User-Agent': `MediaDownloader/${APP_VERSION}`,
          'Accept': '*/*',
          'Connection': 'keep-alive'
        }
      };

      protocol.get(options, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          download(response.headers.location);
          return;
        }

        totalBytes = parseInt(response.headers['content-length'], 10) || 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0 && mainWindow && !mainWindow.isDestroyed()) {
            const percent = Math.round((downloadedBytes / totalBytes) * 100);
            const speed = (downloadedBytes / 1024 / 1024).toFixed(2);
            mainWindow.webContents.send('update-download-progress', {
              percent,
              downloadedBytes,
              totalBytes,
              speed: `${speed} MB`
            });
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            // Setup uygulamasını ana süreçten bağımsız başlat
            const installer = spawn(setupPath, [], {
              detached: true,
              stdio: 'ignore'
            });
            installer.unref();

            // Mevcut uygulamayı hemen kapat ki dosyalar kilitli kalmasın
            setTimeout(() => {
              app.exit(0);
            }, 500);

            resolve({ success: true, path: setupPath });
          });
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
    if (!fs.existsSync(appDataDir)) {
      fs.mkdirSync(appDataDir, { recursive: true });
    }

    const ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    const destPath = path.join(appDataDir, 'yt-dlp.exe');
    const tempPath = destPath + '.tmp';

    const file = fs.createWriteStream(tempPath);

    const download = (url) => {
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          download(response.headers.location);
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            try {
              if (fs.existsSync(destPath)) {
                fs.unlinkSync(destPath);
              }
              fs.renameSync(tempPath, destPath);
              resolve({ success: true, path: destPath });
            } catch (err) {
              resolve({ success: false, error: err.message });
            }
          });
        });
      }).on('error', (e) => {
        fs.unlink(tempPath, () => { });
        resolve({ success: false, error: e.message });
      });
    };

    download(ytdlpUrl);
  });
});

// Download and unpack FFmpeg to AppData
ipcMain.handle('download-ffmpeg', async () => {
  return new Promise((resolve) => {
    if (!fs.existsSync(appDataDir)) {
      fs.mkdirSync(appDataDir, { recursive: true });
    }

    const ffmpegZipUrl = 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
    const zipPath = path.join(appDataDir, 'ffmpeg-temp.zip');
    const file = fs.createWriteStream(zipPath);

    let totalBytes = 0;
    let downloadedBytes = 0;

    const download = (url) => {
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          download(response.headers.location);
          return;
        }

        totalBytes = parseInt(response.headers['content-length'], 10) || 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0 && mainWindow && !mainWindow.isDestroyed()) {
            const percent = Math.round((downloadedBytes / totalBytes) * 100);
            mainWindow.webContents.send('ffmpeg-download-progress', {
              percent,
              downloadedBytes,
              totalBytes
            });
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            // Extract ffmpeg.exe and ffprobe.exe using tar.exe or powershell
            const extractCmd = `tar -xf "${zipPath}" --strip-components=2 -C "${appDataDir}" "*/bin/ffmpeg.exe" "*/bin/ffprobe.exe"`;
            exec(extractCmd, (tarErr) => {
              // Clean up zip
              try { fs.unlinkSync(zipPath); } catch (e) { }

              if (tarErr) {
                // Fallback to PowerShell Expand-Archive
                const psCmd = `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${appDataDir}\\temp_ff' -Force; Copy-Item '${appDataDir}\\temp_ff\\*\\bin\\*.exe' -Destination '${appDataDir}' -Force; Remove-Item '${appDataDir}\\temp_ff' -Recurse -Force"`;
                exec(psCmd, (psErr) => {
                  if (fs.existsSync(appDataFfmpeg)) {
                    resolve({ success: true, path: appDataFfmpeg });
                  } else {
                    resolve({ success: false, error: 'FFmpeg arşivden çıkarılamadı: ' + (psErr ? psErr.message : tarErr.message) });
                  }
                });
                return;
              }

              if (fs.existsSync(appDataFfmpeg)) {
                resolve({ success: true, path: appDataFfmpeg });
              } else {
                resolve({ success: false, error: 'ffmpeg.exe başarıyla oluşturulamadı' });
              }
            });
          });
        });
      }).on('error', (e) => {
        try { fs.unlinkSync(zipPath); } catch (_) { }
        resolve({ success: false, error: e.message });
      });
    };

    download(ffmpegZipUrl);
  });
});

// Open external URL
ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});
