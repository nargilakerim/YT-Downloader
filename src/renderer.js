import './index.css';

// YouTube Indirici - Renderer Process
document.addEventListener('DOMContentLoaded', async () => {
  // ============================================
  // DOM Elementleri
  // ============================================

  // Pencere kontrolleri
  const btnMinimize = document.getElementById('btn-minimize');
  const btnMaximize = document.getElementById('btn-maximize');
  const btnClose = document.getElementById('btn-close');

  // Navigasyon
  const navButtons = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page');

  // Ana sayfa elementleri
  const urlInput = document.getElementById('url-input');
  const btnFetch = document.getElementById('btn-fetch');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');

  // Video bilgi karti
  const videoInfo = document.getElementById('video-info');
  const videoThumbnail = document.getElementById('video-thumbnail');
  const videoTitle = document.getElementById('video-title');
  const videoDuration = document.getElementById('video-duration');
  const videoUploader = document.getElementById('video-uploader');
  const videoViews = document.getElementById('video-views');
  const qualitySelect = document.getElementById('quality-select');
  const qualityGroup = document.getElementById('quality-group');
  const btnDownload = document.getElementById('btn-download');

  // Playlist bilgi karti
  const playlistInfo = document.getElementById('playlist-info');
  const playlistThumbnail = document.getElementById('playlist-thumbnail');
  const playlistTitle = document.getElementById('playlist-title');
  const playlistCount = document.getElementById('playlist-count');
  const playlistItems = document.getElementById('playlist-items');
  const btnDownloadPlaylist = document.getElementById('btn-download-playlist');

  // Indirme ilerleme
  const downloadProgress = document.getElementById('download-progress');
  const progressTitle = document.getElementById('progress-title');
  const progressFill = document.getElementById('progress-fill');
  const progressPercent = document.getElementById('progress-percent');
  const btnCancel = document.getElementById('btn-cancel');

  // Indirme tamamlandi
  const downloadComplete = document.getElementById('download-complete');
  const btnOpenFile = document.getElementById('btn-open-file');
  const btnOpenFolder = document.getElementById('btn-open-folder');
  const btnDone = document.getElementById('btn-done');

  // Gecmis sayfasi
  const historyList = document.getElementById('history-list');
  const historyEmpty = document.getElementById('history-empty');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // Ayarlar sayfasi
  const videoDownloadPathEl = document.getElementById('video-download-path');
  const btnChangeVideoPath = document.getElementById('btn-change-video-path');
  const audioDownloadPathEl = document.getElementById('audio-download-path');
  const btnChangeAudioPath = document.getElementById('btn-change-audio-path');
  const themeOptions = document.querySelectorAll('.theme-option');
  const themeToggle = document.getElementById('theme-toggle');
  const ytdlpStatus = document.getElementById('ytdlp-status');

  // Durum degiskenleri
  let currentVideoInfo = null;
  let lastDownloadPath = null;
  let videoDownloadPath = null;
  let audioDownloadPath = null;

  // ============================================
  // Baslangic Ayarlari
  // ============================================

  async function initialize() {
    // Tema yukle
    const theme = await window.electronAPI.getTheme();
    setTheme(theme);

    // Indirme yollarini yukle
    videoDownloadPath = await window.electronAPI.getStoreValue('videoPath') || await window.electronAPI.getStoreValue('downloadPath');
    audioDownloadPath = await window.electronAPI.getStoreValue('audioPath') || videoDownloadPath;

    if (videoDownloadPath) videoDownloadPathEl.textContent = videoDownloadPath;
    if (audioDownloadPath) audioDownloadPathEl.textContent = audioDownloadPath;

    // yt-dlp durumunu kontrol et
    const ytdlpCheck = await window.electronAPI.checkYtDlp();
    if (ytdlpCheck.installed) {
      ytdlpStatus.textContent = `Kurulu (v${ytdlpCheck.version})`;
      ytdlpStatus.style.color = 'var(--success)';
    } else {
      ytdlpStatus.textContent = 'Kurulu değil - Lütfen yükleyin';
      ytdlpStatus.style.color = 'var(--error)';
    }

    // Gecmisi yukle
    await loadHistory();
  }

  initialize();

  // ============================================
  // Pencere Kontrolleri
  // ============================================

  btnMinimize.addEventListener('click', () => {
    window.electronAPI.minimizeWindow();
  });

  btnMaximize.addEventListener('click', () => {
    window.electronAPI.maximizeWindow();
  });

  btnClose.addEventListener('click', () => {
    window.electronAPI.closeWindow();
  });

  // ============================================
  // Navigasyon
  // ============================================

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPage = btn.dataset.page;

      // Aktif durumu guncelle
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Sayfalari goster/gizle
      pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === `page-${targetPage}`) {
          page.classList.add('active');
        }
      });

      // Gecmis sayfasina gecince yukle
      if (targetPage === 'history') {
        loadHistory();
      }
    });
  });

  // ============================================
  // Tema Yonetimi
  // ============================================

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    // Tema butonlarini guncelle
    themeOptions.forEach(option => {
      option.classList.toggle('active', option.dataset.theme === theme);
    });
  }

  themeOptions.forEach(option => {
    option.addEventListener('click', async () => {
      const theme = option.dataset.theme;
      await window.electronAPI.setTheme(theme);
      setTheme(theme);
    });
  });

  themeToggle.addEventListener('click', async () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    await window.electronAPI.setTheme(newTheme);
    setTheme(newTheme);
  });

  // ============================================
  // URL Getirme ve Video Bilgisi
  // ============================================

  btnFetch.addEventListener('click', fetchVideoInfo);

  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      fetchVideoInfo();
    }
  });

  // URL yapistirdiginda otomatik getir
  urlInput.addEventListener('paste', () => {
    setTimeout(fetchVideoInfo, 100);
  });

  async function fetchVideoInfo() {
    const url = urlInput.value.trim();

    if (!url) {
      showError('Lütfen bir YouTube URLsi girin');
      return;
    }

    if (!isValidYouTubeUrl(url)) {
      showError('Geçersiz YouTube URLsi');
      return;
    }

    // UIyi sifirla
    hideError();
    hideAllCards();

    // Yukleniyor durumu
    btnFetch.classList.add('btn-loading');
    btnFetch.disabled = true;

    try {
      const result = await window.electronAPI.getVideoInfo(url);

      if (!result.success) {
        showError(result.error || 'Video bilgisi alinamadi');
        return;
      }

      currentVideoInfo = result.data;

      if (result.data.isPlaylist) {
        showPlaylistInfo(result.data);
      } else {
        showVideoInfo(result.data);
      }
    } catch (error) {
      showError('Bir hata olustu: ' + error.message);
    } finally {
      btnFetch.classList.remove('btn-loading');
      btnFetch.disabled = false;
    }
  }

  function isValidYouTubeUrl(url) {
    const patterns = [
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/
    ];
    return patterns.some(pattern => pattern.test(url));
  }

  function showVideoInfo(info) {
    videoThumbnail.src = info.thumbnail || '';
    videoTitle.textContent = info.title;
    videoDuration.textContent = formatDuration(info.duration);
    videoUploader.textContent = info.uploader || 'Bilinmeyen';
    videoViews.textContent = formatViews(info.viewCount);

    videoInfo.classList.remove('hidden');
  }

  function showPlaylistInfo(info) {
    playlistThumbnail.src = info.thumbnail || '';
    playlistTitle.textContent = info.title;
    playlistCount.textContent = `${info.itemCount} video`;

    // Playlist ogelerini listele
    playlistItems.innerHTML = '';
    (info.items || []).slice(0, 20).forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'playlist-item';
      itemEl.innerHTML = `
        <img src="${item.thumbnail || ''}" alt="">
        <div class="playlist-item-info">
          <h4>${item.title}</h4>
          <span>${formatDuration(item.duration)}</span>
        </div>
      `;
      playlistItems.appendChild(itemEl);
    });

    if (info.itemCount > 20) {
      const moreEl = document.createElement('div');
      moreEl.className = 'playlist-item';
      moreEl.innerHTML = `
        <div class="playlist-item-info">
          <h4>... ve ${info.itemCount - 20} video daha</h4>
        </div>
      `;
      playlistItems.appendChild(moreEl);
    }

    playlistInfo.classList.remove('hidden');
  }

  // ============================================
  // Indirme Islemleri
  // ============================================

  // Indirme turu degisimi
  document.querySelectorAll('input[name="download-type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      qualityGroup.classList.toggle('hidden', e.target.value === 'audio');
    });
  });

  btnDownload.addEventListener('click', startDownload);
  btnDownloadPlaylist.addEventListener('click', startPlaylistDownload);

  async function startDownload() {
    if (!currentVideoInfo) return;

    const downloadType = document.querySelector('input[name="download-type"]:checked').value;
    const quality = qualitySelect.value;

    // UI guncelle
    videoInfo.classList.add('hidden');
    downloadProgress.classList.remove('hidden');
    progressTitle.textContent = currentVideoInfo.title;
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';

    try {
      const targetPath = downloadType === 'audio' ? audioDownloadPath : videoDownloadPath;
      if (!targetPath) {
        showError('Lütfen bir indirme konumu seçin (Ayarlar)');
        downloadProgress.classList.add('hidden');
        videoInfo.classList.remove('hidden');
        return;
      }

      await window.electronAPI.startDownload({
        url: currentVideoInfo.url,
        title: currentVideoInfo.title,
        thumbnail: currentVideoInfo.thumbnail,
        type: downloadType,
        quality: quality === 'best' ? 'best' : parseInt(quality),
        outputPath: targetPath
      });
    } catch (error) {
      showError('Indirme baslatilamadi: ' + error.message);
      downloadProgress.classList.add('hidden');
    }
  }

  async function startPlaylistDownload() {
    if (!currentVideoInfo || !currentVideoInfo.isPlaylist) return;

    const downloadType = document.querySelector('input[name="playlist-type"]:checked').value;

    // UI guncelle
    playlistInfo.classList.add('hidden');
    downloadProgress.classList.remove('hidden');
    progressTitle.textContent = `Playlist: ${currentVideoInfo.title}`;
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';

    try {
      await window.electronAPI.startDownload({
        url: currentVideoInfo.url,
        title: currentVideoInfo.title,
        thumbnail: currentVideoInfo.thumbnail,
        type: downloadType,
        quality: 'best'
      });
    } catch (error) {
      showError('Indirme baslatilamadi: ' + error.message);
      downloadProgress.classList.add('hidden');
    }
  }

  // Indirme olaylarini dinle
  window.electronAPI.onDownloadProgress((progress) => {
    progressFill.style.width = `${progress.percent}%`;
    progressPercent.textContent = `${Math.round(progress.percent)}%`;
  });

  window.electronAPI.onDownloadComplete((result) => {
    downloadProgress.classList.add('hidden');
    downloadComplete.classList.remove('hidden');
    lastDownloadPath = result.filePath;

    // Gecmisi guncelle
    loadHistory();
  });

  window.electronAPI.onDownloadError((error) => {
    downloadProgress.classList.add('hidden');
    showError('Indirme hatasi: ' + error);
  });

  btnCancel.addEventListener('click', async () => {
    await window.electronAPI.cancelDownload();
    downloadProgress.classList.add('hidden');
    if (currentVideoInfo) {
      if (currentVideoInfo.isPlaylist) {
        playlistInfo.classList.remove('hidden');
      } else {
        videoInfo.classList.remove('hidden');
      }
    }
  });

  // Tamamlandi butonlari
  btnOpenFile.addEventListener('click', () => {
    if (lastDownloadPath) {
      window.electronAPI.openFile(lastDownloadPath);
    }
  });

  btnOpenFolder.addEventListener('click', () => {
    if (lastDownloadPath) {
      window.electronAPI.openFolder(lastDownloadPath);
    }
  });

  btnDone.addEventListener('click', () => {
    downloadComplete.classList.add('hidden');

    // Eger input bos degilse (kullanici yeni link yapistirdiysa) her seyi gizleme
    if (urlInput.value.trim() !== '') {
      if (currentVideoInfo) {
        if (currentVideoInfo.isPlaylist) {
          playlistInfo.classList.remove('hidden');
        } else {
          videoInfo.classList.remove('hidden');
        }
      }
    } else {
      // Input bossa her seyi temizle
      hideAllCards();
      currentVideoInfo = null;
      urlInput.focus();
    }
  });

  // ============================================
  // Gecmis Yonetimi
  // ============================================

  async function loadHistory() {
    const history = await window.electronAPI.getHistory();

    if (history.length === 0) {
      historyList.classList.add('hidden');
      historyEmpty.classList.remove('hidden');
      return;
    }

    historyList.classList.remove('hidden');
    historyEmpty.classList.add('hidden');

    historyList.innerHTML = '';
    history.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'history-item';
      itemEl.innerHTML = `
        <img src="${item.thumbnail || ''}" alt="">
        <div class="history-item-info">
          <h4>${item.title}</h4>
          <p>${formatDate(item.date)} • ${item.type === 'audio' ? 'Ses' : 'Video'}</p>
        </div>
        <div class="history-item-actions">
          <button class="btn-open-folder" data-path="${item.filePath}">Klasörü Aç</button>
          <button class="btn-delete-item" data-id="${item.id}">Sil</button>
        </div>
      `;
      historyList.appendChild(itemEl);
    });

    // Event listeners for history actions
    historyList.querySelectorAll('.btn-open-folder').forEach(btn => {
      btn.addEventListener('click', () => {
        window.electronAPI.openFolder(btn.dataset.path);
      });
    });

    historyList.querySelectorAll('.btn-delete-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        await window.electronAPI.deleteHistoryItem(parseInt(btn.dataset.id));
        loadHistory();
      });
    });
  }

  btnClearHistory.addEventListener('click', async () => {
    if (confirm('Tüm indirme geçmişini silmek istediğinize emin misiniz?')) {
      await window.electronAPI.clearHistory();
      loadHistory();
    }
  });

  // ============================================
  // Ayarlar
  // ============================================

  btnChangeVideoPath.addEventListener('click', async () => {
    const newPath = await window.electronAPI.selectFolder();
    if (newPath) {
      videoDownloadPath = newPath;
      videoDownloadPathEl.textContent = newPath;
      await window.electronAPI.setStoreValue('videoPath', newPath);
    }
  });

  btnChangeAudioPath.addEventListener('click', async () => {
    const newPath = await window.electronAPI.selectFolder();
    if (newPath) {
      audioDownloadPath = newPath;
      audioDownloadPathEl.textContent = newPath;
      await window.electronAPI.setStoreValue('audioPath', newPath);
    }
  });

  // ============================================
  // Yardimci Fonksiyonlar
  // ============================================

  function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
  }

  function hideError() {
    errorMessage.classList.add('hidden');
  }

  function hideAllCards() {
    videoInfo.classList.add('hidden');
    playlistInfo.classList.add('hidden');
    downloadProgress.classList.add('hidden');
    downloadComplete.classList.add('hidden');
  }

  function formatDuration(seconds) {
    if (!seconds) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function formatViews(views) {
    if (!views) return 'Bilinmiyor';
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M goruntulenme`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K goruntulenme`;
    }
    return `${views} goruntulenme`;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ============================================
  // Update System
  // ============================================

  const updateModal = document.getElementById('update-modal');
  const updateVersionInfo = document.getElementById('update-version-info');
  const updateNotes = document.getElementById('update-notes');
  const btnDownloadUpdate = document.getElementById('btn-download-update');
  const btnCheckUpdates = document.getElementById('btn-check-updates');
  const appVersionText = document.getElementById('app-version-text');

  // Update modal elements  
  const ytdlpDownloadModal = document.getElementById('ytdlp-download-modal');
  const ytdlpDownloadStatus = document.getElementById('ytdlp-download-status');
  const btnAutoDownloadYtdlp = document.getElementById('btn-auto-download-ytdlp');

  // Check for updates on startup
  async function checkForUpdates(showNoUpdateMessage = false) {
    try {
      const result = await window.electronAPI.checkForUpdates();

      if (result.hasUpdate) {
        updateVersionInfo.textContent = `v${result.currentVersion} → v${result.latestVersion}`;
        updateNotes.textContent = result.releaseNotes || 'Yeni özellikler ve hata düzeltmeleri içerir.';
        updateModal.classList.remove('hidden');

        // Store download URL for button
        btnDownloadUpdate.dataset.url = result.downloadUrl;
      } else if (showNoUpdateMessage) {
        alert('Uygulamanız güncel! ✅');
      }

      // Update version text
      if (appVersionText) {
        appVersionText.textContent = `YouTube İndirici v${result.currentVersion}`;
      }
    } catch (error) {
      console.error('Update check failed:', error);
    }
  }

  // Check for updates on startup (after 2 seconds)
  setTimeout(() => checkForUpdates(false), 2000);

  // Manual update check button
  if (btnCheckUpdates) {
    btnCheckUpdates.addEventListener('click', () => checkForUpdates(true));
  }

  // Download update button
  if (btnDownloadUpdate) {
    btnDownloadUpdate.addEventListener('click', () => {
      const url = btnDownloadUpdate.dataset.url;
      if (url) {
        window.electronAPI.openExternal(url);
      }
    });
  }

  // ============================================
  // yt-dlp Auto Download
  // ============================================

  if (btnAutoDownloadYtdlp) {
    btnAutoDownloadYtdlp.addEventListener('click', async () => {
      // Show download modal
      ytdlpDownloadModal.classList.remove('hidden');
      ytdlpDownloadStatus.textContent = 'yt-dlp indiriliyor, lütfen bekleyin...';

      try {
        const result = await window.electronAPI.downloadYtDlp();

        if (result.success) {
          ytdlpDownloadStatus.textContent = '✅ yt-dlp başarıyla indirildi!';
          ytdlpStatus.textContent = 'Kurulu (yeni)';
          ytdlpStatus.style.color = 'var(--success)';

          // Hide modal after 2 seconds
          setTimeout(() => {
            ytdlpDownloadModal.classList.add('hidden');
          }, 2000);
        } else {
          ytdlpDownloadStatus.textContent = `❌ İndirme başarısız: ${result.error}`;
        }
      } catch (error) {
        ytdlpDownloadStatus.textContent = `❌ Hata: ${error.message}`;
      }
    });
  }

  // Close modals when clicking overlay
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
      // Don't allow closing update modal if there's an update (forced update)
      const modal = overlay.closest('.modal');
      if (modal && modal.id !== 'update-modal') {
        modal.classList.add('hidden');
      }
    });
  });
});

