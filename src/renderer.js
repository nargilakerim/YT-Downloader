import './index.css';

// Media Downloader - Renderer Process
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
  const historyCountBadge = document.getElementById('history-count-badge');

  // Başlık çubuğu motor durumları
  const pillYtdlp = document.getElementById('pill-ytdlp');
  const pillFfmpeg = document.getElementById('pill-ffmpeg');

  // Ana sayfa elementleri
  const urlInput = document.getElementById('url-input');
  const btnPaste = document.getElementById('btn-paste');
  const btnClear = document.getElementById('btn-clear');
  const btnFetch = document.getElementById('btn-fetch');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const btnErrorClose = document.getElementById('btn-error-close');
  const homeFeaturesGrid = document.getElementById('home-features-grid');

  // Video bilgi kartı
  const videoInfo = document.getElementById('video-info');
  const videoThumbnail = document.getElementById('video-thumbnail');
  const videoTitle = document.getElementById('video-title');
  const videoDuration = document.getElementById('video-duration');
  const videoUploader = document.getElementById('video-uploader');
  const videoViews = document.getElementById('video-views');
  const mediaPlatformBadge = document.getElementById('media-platform-badge');
  const qualitySelect = document.getElementById('quality-select');
  const qualityGroup = document.getElementById('quality-group');
  const filenameInput = document.getElementById('filename-input');
  const btnDownload = document.getElementById('btn-download');

  // Format kartları (Video / Ses)
  const formatCards = document.querySelectorAll('.format-card');

  // Playlist bilgi kartı
  const playlistInfo = document.getElementById('playlist-info');
  const playlistThumbnail = document.getElementById('playlist-thumbnail');
  const playlistTitle = document.getElementById('playlist-title');
  const playlistCount = document.getElementById('playlist-count');
  const playlistItems = document.getElementById('playlist-items');
  const btnDownloadPlaylist = document.getElementById('btn-download-playlist');

  // İndirme ilerleme kartı
  const downloadProgress = document.getElementById('download-progress');
  const progressTitle = document.getElementById('progress-title');
  const progressFill = document.getElementById('progress-fill');
  const progressPercent = document.getElementById('progress-percent');
  const progressSpeed = document.getElementById('progress-speed');
  const progressEta = document.getElementById('progress-eta');
  const btnCancel = document.getElementById('btn-cancel');

  // İndirme tamamlandı kartı
  const downloadComplete = document.getElementById('download-complete');
  const btnOpenFile = document.getElementById('btn-open-file');
  const btnOpenFolder = document.getElementById('btn-open-folder');
  const btnDone = document.getElementById('btn-done');

  // Geçmiş sayfası
  const historyList = document.getElementById('history-list');
  const historyEmpty = document.getElementById('history-empty');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const filterPills = document.querySelectorAll('.filter-pill');
  const statTotal = document.getElementById('stat-total');
  const statVideos = document.getElementById('stat-videos');
  const statAudios = document.getElementById('stat-audios');

  // Ayarlar sayfası
  const videoDownloadPathEl = document.getElementById('video-download-path');
  const btnChangeVideoPath = document.getElementById('btn-change-video-path');
  const audioDownloadPathEl = document.getElementById('audio-download-path');
  const btnChangeAudioPath = document.getElementById('btn-change-audio-path');
  const sidebarDownloadPath = document.getElementById('sidebar-download-path');
  const themeOptions = document.querySelectorAll('.theme-option');
  const themeToggle = document.getElementById('theme-toggle');
  const ytdlpStatusBadge = document.getElementById('ytdlp-status-badge');
  const ffmpegStatusBadge = document.getElementById('ffmpeg-status-badge');
  const btnAutoDownloadYtdlp = document.getElementById('btn-auto-download-ytdlp');
  const btnAutoDownloadFfmpeg = document.getElementById('btn-auto-download-ffmpeg');
  const btnCheckUpdates = document.getElementById('btn-check-updates');
  const appVersionText = document.getElementById('app-version-text');

  // Modallar
  const updateModal = document.getElementById('update-modal');
  const updateVersionInfo = document.getElementById('update-version-info');
  const updateNotes = document.getElementById('update-notes');
  const btnDownloadUpdate = document.getElementById('btn-download-update');

  const engineModal = document.getElementById('engine-download-modal');
  const engineModalTitle = document.getElementById('engine-modal-title');
  const engineModalDesc = document.getElementById('engine-modal-desc');
  const engineModalProgressFill = document.getElementById('engine-modal-progress-fill');
  const engineModalStatusText = document.getElementById('engine-modal-status-text');

  // Durum değişkenleri
  let currentVideoInfo = null;
  let lastDownloadPath = null;
  let videoDownloadPath = null;
  let audioDownloadPath = null;
  let currentHistoryFilter = 'all';
  let downloadStats = { total: 0, videos: 0, audios: 0 };
  let engineStatus = { ytdlp: false, ffmpeg: false };

  // ============================================
  // Başlangıç Ayarları
  // ============================================

  async function initialize() {
    // Tema yükle
    const theme = await window.electronAPI.getTheme() || 'dark';
    setTheme(theme);

    // İndirme yollarını yükle
    videoDownloadPath = await window.electronAPI.getStoreValue('videoPath') || await window.electronAPI.getStoreValue('downloadPath');
    audioDownloadPath = await window.electronAPI.getStoreValue('audioPath') || videoDownloadPath;

    if (videoDownloadPath) {
      if (videoDownloadPathEl) videoDownloadPathEl.textContent = videoDownloadPath;
      if (sidebarDownloadPath) sidebarDownloadPath.textContent = getFolderBasename(videoDownloadPath);
    }
    if (audioDownloadPath && audioDownloadPathEl) {
      audioDownloadPathEl.textContent = audioDownloadPath;
    }

    // Uygulama sürümü
    const appVer = await window.electronAPI.getAppVersion();
    if (appVersionText) {
      appVersionText.textContent = `Media Downloader v${appVer}`;
    }

    // Motor durumlarını kontrol et
    await checkCoreEngines();

    // İstatistik ve Geçmişi yükle
    await loadStats();
    await loadHistory();
  }

  function getFolderBasename(p) {
    if (!p) return 'İndirilenler';
    const parts = p.split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 1] || p;
  }

  initialize();

  // ============================================
  // Motor Durum Kontrolü (yt-dlp & FFmpeg)
  // ============================================

  async function checkCoreEngines() {
    try {
      const engines = await window.electronAPI.checkEngines();

      // yt-dlp
      if (engines.ytdlp && engines.ytdlp.installed) {
        engineStatus.ytdlp = true;
        if (pillYtdlp) {
          pillYtdlp.className = 'engine-pill ready';
          pillYtdlp.title = `yt-dlp Kurulu: v${engines.ytdlp.version}`;
        }
        if (ytdlpStatusBadge) {
          ytdlpStatusBadge.className = 'status-indicator-badge ok';
          ytdlpStatusBadge.textContent = `✅ Kurulu (v${engines.ytdlp.version})`;
        }
      } else {
        engineStatus.ytdlp = false;
        if (pillYtdlp) {
          pillYtdlp.className = 'engine-pill missing';
          pillYtdlp.title = 'yt-dlp Eksik! İndirmek için tıklayın';
        }
        if (ytdlpStatusBadge) {
          ytdlpStatusBadge.className = 'status-indicator-badge bad';
          ytdlpStatusBadge.textContent = '❌ Eksik - Kurulum Gerekli';
        }
      }

      // FFmpeg
      if (engines.ffmpeg && engines.ffmpeg.installed) {
        engineStatus.ffmpeg = true;
        if (pillFfmpeg) {
          pillFfmpeg.className = 'engine-pill ready';
          pillFfmpeg.title = `FFmpeg Kurulu (${engines.ffmpeg.version})`;
        }
        if (ffmpegStatusBadge) {
          ffmpegStatusBadge.className = 'status-indicator-badge ok';
          ffmpegStatusBadge.textContent = `✅ Kurulu (${engines.ffmpeg.version})`;
        }
      } else {
        engineStatus.ffmpeg = false;
        if (pillFfmpeg) {
          pillFfmpeg.className = 'engine-pill missing';
          pillFfmpeg.title = 'FFmpeg Eksik! MP3 için gereklidir';
        }
        if (ffmpegStatusBadge) {
          ffmpegStatusBadge.className = 'status-indicator-badge bad';
          ffmpegStatusBadge.textContent = '⚠️ Eksik (MP3 için gerekli)';
        }
      }
    } catch (e) {
      console.error('Engine check error:', e);
    }
  }

  // ============================================
  // Pencere Kontrolleri
  // ============================================

  btnMinimize.addEventListener('click', () => window.electronAPI.minimizeWindow());
  btnMaximize.addEventListener('click', () => window.electronAPI.maximizeWindow());
  btnClose.addEventListener('click', () => window.electronAPI.closeWindow());

  // ============================================
  // Sayfa Navigasyonu
  // ============================================

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPage = btn.dataset.page;

      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === `page-${targetPage}`) {
          page.classList.add('active');
        }
      });

      if (targetPage === 'history') {
        loadHistory();
      } else if (targetPage === 'settings') {
        checkCoreEngines();
      }
    });
  });

  // ============================================
  // Tema Yönetimi
  // ============================================

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
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

  if (themeToggle) {
    themeToggle.addEventListener('click', async () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      await window.electronAPI.setTheme(newTheme);
      setTheme(newTheme);
    });
  }

  // ============================================
  // URL Girişi & Arama Mantığı
  // ============================================

  // Input değişiminde temizle butonunu göster/gizle
  urlInput.addEventListener('input', () => {
    if (urlInput.value.trim().length > 0) {
      btnClear.classList.remove('hidden');
    } else {
      btnClear.classList.add('hidden');
    }
  });

  // Temizle butonu
  btnClear.addEventListener('click', () => {
    urlInput.value = '';
    btnClear.classList.add('hidden');
    hideError();
    hideAllCards();
    if (homeFeaturesGrid) homeFeaturesGrid.classList.remove('hidden');
    urlInput.focus();
  });

  // Panodan Yapıştır butonu
  btnPaste.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        urlInput.value = text.trim();
        btnClear.classList.remove('hidden');
        fetchVideoInfo();
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  });

  // Enter ile getir
  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      fetchVideoInfo();
    }
  });

  btnFetch.addEventListener('click', fetchVideoInfo);

  if (btnErrorClose) {
    btnErrorClose.addEventListener('click', hideError);
  }

  async function fetchVideoInfo() {
    const url = urlInput.value.trim();

    if (!url) {
      showError('Lütfen indirmek istediğiniz medya bağlantısını yapıştırın.');
      return;
    }

    if (!isValidUrl(url)) {
      showError('Geçersiz bağlantı formatı. Lütfen http:// veya https:// ile başlayan bir URL girin.');
      return;
    }

    hideError();
    hideAllCards();
    if (homeFeaturesGrid) homeFeaturesGrid.classList.add('hidden');

    btnFetch.classList.add('btn-loading');
    btnFetch.disabled = true;

    try {
      const result = await window.electronAPI.getVideoInfo(url);

      if (!result.success) {
        showError(result.error || 'Medya bilgisi alınamadı.');
        if (homeFeaturesGrid) homeFeaturesGrid.classList.remove('hidden');
        return;
      }

      currentVideoInfo = result.data;

      if (result.data.isPlaylist) {
        showPlaylistInfo(result.data);
      } else {
        showVideoInfo(result.data);
      }
    } catch (error) {
      showError('Hata oluştu: ' + error.message);
      if (homeFeaturesGrid) homeFeaturesGrid.classList.remove('hidden');
    } finally {
      btnFetch.classList.remove('btn-loading');
      btnFetch.disabled = false;
    }
  }

  function isValidUrl(str) {
    try {
      const parsed = new URL(str);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function showVideoInfo(info) {
    videoThumbnail.src = info.thumbnail || '';
    videoTitle.textContent = info.title;
    videoDuration.textContent = formatDuration(info.duration);
    videoUploader.textContent = info.uploader || 'Bilinmeyen Kanal';
    videoViews.textContent = formatViews(info.viewCount);
    
    // Platform tespiti
    let platform = 'Medya';
    if (info.url.includes('youtube.com') || info.url.includes('youtu.be')) platform = 'YouTube';
    else if (info.url.includes('instagram.com')) platform = 'Instagram';
    else if (info.url.includes('tiktok.com')) platform = 'TikTok';
    else if (info.url.includes('twitter.com') || info.url.includes('x.com')) platform = 'X / Twitter';
    else if (info.url.includes('soundcloud.com')) platform = 'SoundCloud';
    else if (info.url.includes('facebook.com') || info.url.includes('fb.watch')) platform = 'Facebook';

    if (mediaPlatformBadge) mediaPlatformBadge.textContent = platform;

    videoInfo.classList.remove('hidden');
    videoInfo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showPlaylistInfo(info) {
    playlistThumbnail.src = info.thumbnail || '';
    playlistTitle.textContent = info.title;
    playlistCount.textContent = `${info.itemCount} video / parça`;

    playlistItems.innerHTML = '';
    (info.items || []).slice(0, 25).forEach((item) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'history-item-card';
      itemEl.innerHTML = `
        <img class="history-thumb" src="${item.thumbnail || ''}" alt="">
        <div class="history-info">
          <div class="history-item-title">${item.title}</div>
          <div class="history-item-meta">${formatDuration(item.duration)}</div>
        </div>
      `;
      playlistItems.appendChild(itemEl);
    });

    playlistInfo.classList.remove('hidden');
    playlistInfo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Format Kartı Seçimleri (Video / Ses)
  formatCards.forEach(card => {
    card.addEventListener('click', () => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        // Group toggle
        const groupName = radio.name;
        document.querySelectorAll(`input[name="${groupName}"]`).forEach(r => {
          r.closest('.format-card')?.classList.toggle('active', r.checked);
        });

        if (groupName === 'download-type') {
          qualityGroup.classList.toggle('hidden', radio.value === 'audio');
        }
      }
    });
  });

  // ============================================
  // İndirme İşlemleri
  // ============================================

  btnDownload.addEventListener('click', startDownload);
  btnDownloadPlaylist.addEventListener('click', startPlaylistDownload);

  async function startDownload() {
    if (!currentVideoInfo) return;

    const downloadTypeRadio = document.querySelector('input[name="download-type"]:checked');
    const downloadType = downloadTypeRadio ? downloadTypeRadio.value : 'video';
    const quality = qualitySelect.value;
    const customFilename = filenameInput?.value?.trim() || '';

    // MP3 indirmeden önce FFmpeg kontrolü
    if (downloadType === 'audio' && !engineStatus.ffmpeg) {
      const proceed = confirm(
        '⚠️ DİKKAT: MP3 dönüştürme için FFmpeg motoru gereklidir.\n\n' +
        'Şu anda FFmpeg kurulu görünmüyor. FFmpeg motorunu şimdi otomatik indirmek ister misiniz?'
      );
      if (proceed) {
        downloadFFmpegModal();
      }
      return;
    }

    // UI'ı İlerleme Moduna Al
    videoInfo.classList.add('hidden');
    downloadProgress.classList.remove('hidden');
    progressTitle.textContent = customFilename || currentVideoInfo.title;
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';
    if (progressSpeed) progressSpeed.textContent = 'Başlatılıyor...';
    if (progressEta) progressEta.textContent = 'Hesaplanıyor...';

    try {
      const targetPath = downloadType === 'audio' ? audioDownloadPath : videoDownloadPath;

      await window.electronAPI.startDownload({
        url: currentVideoInfo.url,
        title: currentVideoInfo.title,
        thumbnail: currentVideoInfo.thumbnail,
        type: downloadType,
        quality: quality === 'best' ? 'best' : parseInt(quality, 10),
        outputPath: targetPath,
        customFilename: customFilename
      });

      if (filenameInput) filenameInput.value = '';
    } catch (error) {
      showError('İndirme başlatılamadı: ' + error.message);
      downloadProgress.classList.add('hidden');
      videoInfo.classList.remove('hidden');
    }
  }

  async function startPlaylistDownload() {
    if (!currentVideoInfo || !currentVideoInfo.isPlaylist) return;

    const downloadTypeRadio = document.querySelector('input[name="playlist-type"]:checked');
    const downloadType = downloadTypeRadio ? downloadTypeRadio.value : 'video';

    playlistInfo.classList.add('hidden');
    downloadProgress.classList.remove('hidden');
    progressTitle.textContent = `Çalma Listesi: ${currentVideoInfo.title}`;
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';

    try {
      const targetPath = downloadType === 'audio' ? audioDownloadPath : videoDownloadPath;

      await window.electronAPI.startDownload({
        url: currentVideoInfo.url,
        title: currentVideoInfo.title,
        thumbnail: currentVideoInfo.thumbnail,
        type: downloadType,
        quality: 'best',
        outputPath: targetPath
      });
    } catch (error) {
      showError('Çalma listesi başlatılamadı: ' + error.message);
      downloadProgress.classList.add('hidden');
      playlistInfo.classList.remove('hidden');
    }
  }

  // ============================================
  // İndirme Olay Dinleyicileri (Tek Seferlik Bağlantı)
  // ============================================

  window.electronAPI.onDownloadProgress((progress) => {
    const pct = Math.min(100, Math.max(0, Math.round(progress.percent || 0)));
    progressFill.style.width = `${pct}%`;
    progressPercent.textContent = `${pct}%`;

    if (progress.speed && progressSpeed) {
      progressSpeed.textContent = `${progress.speed} MB/s`;
    }
    if (progress.eta && progressEta) {
      progressEta.textContent = `Kalan: ${progress.eta}`;
    }
  });

  window.electronAPI.onDownloadComplete((result) => {
    downloadProgress.classList.add('hidden');
    downloadComplete.classList.remove('hidden');
    lastDownloadPath = result.filePath;

    playNotificationSound();
    updateStats();
    loadHistory();
  });

  window.electronAPI.onDownloadError((err) => {
    downloadProgress.classList.add('hidden');
    showError(err || 'İndirme sırasında bir hata oluştu.');
    if (currentVideoInfo) {
      if (currentVideoInfo.isPlaylist) {
        playlistInfo.classList.remove('hidden');
      } else {
        videoInfo.classList.remove('hidden');
      }
    }
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

  // Tamamlandı butonları
  btnOpenFile.addEventListener('click', () => {
    if (lastDownloadPath) window.electronAPI.openFile(lastDownloadPath);
  });

  btnOpenFolder.addEventListener('click', () => {
    if (lastDownloadPath) window.electronAPI.openFolder(lastDownloadPath);
  });

  btnDone.addEventListener('click', () => {
    downloadComplete.classList.add('hidden');
    hideAllCards();
    if (homeFeaturesGrid) homeFeaturesGrid.classList.remove('hidden');
    currentVideoInfo = null;
    urlInput.value = '';
    btnClear.classList.add('hidden');
    urlInput.focus();
  });

  // ============================================
  // Motor İndirme İşlemleri (FFmpeg & yt-dlp)
  // ============================================

  async function downloadFFmpegModal() {
    engineModal.classList.remove('hidden');
    engineModalTitle.textContent = 'FFmpeg Motoru İndiriliyor...';
    engineModalDesc.textContent = 'MP3 dönüştürme ve yüksek kalite video birleştirme motoru kuruluyor.';
    engineModalProgressFill.style.width = '0%';
    engineModalStatusText.textContent = 'İndirme başlatılıyor...';

    window.electronAPI.onFFmpegProgress((p) => {
      engineModalProgressFill.style.width = `${p.percent}%`;
      engineModalStatusText.textContent = `%${p.percent} İndirildi (${(p.downloadedBytes / 1024 / 1024).toFixed(1)} MB)`;
    });

    try {
      const res = await window.electronAPI.downloadFFmpeg();
      if (res.success) {
        engineModalProgressFill.style.width = '100%';
        engineModalStatusText.textContent = '✅ FFmpeg başarıyla kuruldu!';
        await checkCoreEngines();
        setTimeout(() => engineModal.classList.add('hidden'), 1800);
      } else {
        engineModalStatusText.textContent = `❌ Hata: ${res.error}`;
        setTimeout(() => engineModal.classList.add('hidden'), 4000);
      }
    } catch (e) {
      engineModalStatusText.textContent = `❌ Hata: ${e.message}`;
      setTimeout(() => engineModal.classList.add('hidden'), 4000);
    }
  }

  async function downloadYtDlpModal() {
    engineModal.classList.remove('hidden');
    engineModalTitle.textContent = 'yt-dlp Güncelleniyor...';
    engineModalDesc.textContent = 'En güncel indirme motoru GitHub üzerinden indiriliyor.';
    engineModalProgressFill.style.width = '50%';
    engineModalStatusText.textContent = 'İndiriliyor, lütfen bekleyin...';

    try {
      const res = await window.electronAPI.downloadYtDlp();
      if (res.success) {
        engineModalProgressFill.style.width = '100%';
        engineModalStatusText.textContent = '✅ yt-dlp başarıyla güncellendi!';
        await checkCoreEngines();
        setTimeout(() => engineModal.classList.add('hidden'), 1800);
      } else {
        engineModalStatusText.textContent = `❌ Hata: ${res.error}`;
        setTimeout(() => engineModal.classList.add('hidden'), 4000);
      }
    } catch (e) {
      engineModalStatusText.textContent = `❌ Hata: ${e.message}`;
      setTimeout(() => engineModal.classList.add('hidden'), 4000);
    }
  }

  if (btnAutoDownloadFfmpeg) btnAutoDownloadFfmpeg.addEventListener('click', downloadFFmpegModal);
  if (btnAutoDownloadYtdlp) btnAutoDownloadYtdlp.addEventListener('click', downloadYtDlpModal);

  // Pill'lere tıklayınca eksikse indirmeyi tetikle
  if (pillFfmpeg) {
    pillFfmpeg.addEventListener('click', () => {
      if (!engineStatus.ffmpeg) downloadFFmpegModal();
    });
  }
  if (pillYtdlp) {
    pillYtdlp.addEventListener('click', () => {
      if (!engineStatus.ytdlp) downloadYtDlpModal();
    });
  }

  // ============================================
  // Geçmiş Yönetimi
  // ============================================

  async function loadHistory() {
    const history = await window.electronAPI.getHistory() || [];

    if (historyCountBadge) {
      historyCountBadge.textContent = history.length;
    }

    if (statTotal) statTotal.textContent = downloadStats.total || history.length;
    if (statVideos) statVideos.textContent = downloadStats.videos || 0;
    if (statAudios) statAudios.textContent = downloadStats.audios || 0;

    let filtered = history;
    if (currentHistoryFilter !== 'all') {
      filtered = history.filter(item => item.type === currentHistoryFilter);
    }

    if (filtered.length === 0) {
      historyList.innerHTML = '';
      historyEmpty.classList.remove('hidden');
      return;
    }

    historyEmpty.classList.add('hidden');
    historyList.innerHTML = '';

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-item-card';
      const isAudio = item.type === 'audio';

      card.innerHTML = `
        <img class="history-thumb" src="${item.thumbnail || ''}" alt="">
        <div class="history-info">
          <div class="history-item-title" title="${item.title}">${item.title}</div>
          <div class="history-item-meta">${formatDate(item.date)} • ${isAudio ? '🎵 MP3 Ses' : '🎬 MP4 Video'}</div>
        </div>
        <div class="history-item-actions">
          <button class="btn-secondary btn-small btn-open-folder" data-path="${item.filePath || ''}">Klasörde Göster</button>
          <button class="btn-danger-outline btn-small btn-del-item" data-id="${item.id}">Sil</button>
        </div>
      `;

      card.querySelector('.btn-open-folder')?.addEventListener('click', () => {
        window.electronAPI.openFolder(item.filePath);
      });

      card.querySelector('.btn-del-item')?.addEventListener('click', async () => {
        await window.electronAPI.deleteHistoryItem(item.id);
        loadHistory();
      });

      historyList.appendChild(card);
    });
  }

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentHistoryFilter = pill.dataset.filter;
      loadHistory();
    });
  });

  btnClearHistory.addEventListener('click', async () => {
    if (confirm('Tüm indirme geçmişini temizlemek istediğinize emin misiniz?')) {
      await window.electronAPI.clearHistory();
      loadHistory();
    }
  });

  // ============================================
  // Ayarlar & Klasör Seçimi
  // ============================================

  btnChangeVideoPath.addEventListener('click', async () => {
    const newPath = await window.electronAPI.selectFolder();
    if (newPath) {
      videoDownloadPath = newPath;
      videoDownloadPathEl.textContent = newPath;
      if (sidebarDownloadPath) sidebarDownloadPath.textContent = getFolderBasename(newPath);
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
  // Güncelleme Sistemi
  // ============================================

  let currentSetupUrl = null;

  async function checkForUpdates(manual = false) {
    try {
      const res = await window.electronAPI.checkForUpdates();
      if (res.hasUpdate) {
        updateVersionInfo.textContent = `v${res.currentVersion} → v${res.latestVersion}`;
        updateNotes.innerHTML = parseReleaseNotes(res.releaseNotes);
        currentSetupUrl = res.setupUrl;
        updateModal.classList.remove('hidden');
      } else if (manual) {
        alert('Tebrikler! Media Downloader en güncel sürümde. ✅');
      }
    } catch (e) {
      if (manual) alert('Güncelleme kontrolü başarısız: ' + e.message);
    }
  }

  // GitHub release notes markdown'ını okunabilir HTML'e çevirir
  function parseReleaseNotes(raw) {
    if (!raw) return '<p>Yeni sürüm özellikleri ve hata düzeltmeleri hazır.</p>';

    const lines = raw.split('\n');
    let html = '';
    let inList = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inList) { html += '</ul>'; inList = false; }
        continue;
      }
      // Başlıklar (## veya ###)
      if (trimmed.startsWith('### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<strong style="display:block;color:var(--text-main);margin:10px 0 4px;">${trimmed.replace(/^###\s*/, '')}</strong>`;
      } else if (trimmed.startsWith('## ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<strong style="display:block;color:var(--text-main);font-size:14px;margin:6px 0 6px;">${trimmed.replace(/^##\s*/, '')}</strong>`;
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        // Liste maddesi - inline ** ** bold'u parse et
        if (!inList) { html += '<ul>'; inList = true; }
        let item = trimmed.slice(2)
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:4px;font-size:11.5px;">$1</code>');
        html += `<li>${item}</li>`;
      } else {
        // Normal paragraf
        if (inList) { html += '</ul>'; inList = false; }
        let para = trimmed
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:4px;font-size:11.5px;">$1</code>');
        html += `<p style="margin:4px 0;">${para}</p>`;
      }
    }
    if (inList) html += '</ul>';
    return html;
  }

  if (btnCheckUpdates) btnCheckUpdates.addEventListener('click', () => checkForUpdates(true));
  setTimeout(() => checkForUpdates(false), 2500);

  if (btnDownloadUpdate) {
    btnDownloadUpdate.addEventListener('click', async () => {
      if (currentSetupUrl) {
        btnDownloadUpdate.textContent = 'İndiriliyor...';
        btnDownloadUpdate.disabled = true;
        const res = await window.electronAPI.downloadAndInstallUpdate(currentSetupUrl);
        if (!res.success) {
          alert('Güncelleme indirilemedi: ' + res.error);
          btnDownloadUpdate.textContent = 'Tekrar Dene';
          btnDownloadUpdate.disabled = false;
        }
      }
    });
  }

  // ============================================
  // Yardımcı Fonksiyonlar
  // ============================================

  function showError(msg) {
    errorText.textContent = msg;
    errorMessage.classList.remove('hidden');
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

  function formatDuration(sec) {
    if (!sec) return '--:--';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function formatViews(views) {
    if (!views) return 'Bilinmiyor';
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M görüntülenme`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K görüntülenme`;
    return `${views} görüntülenme`;
  }

  function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async function loadStats() {
    downloadStats = await window.electronAPI.getStoreValue('stats') || { total: 0, videos: 0, audios: 0 };
  }

  async function updateStats() {
    const radio = document.querySelector('input[name="download-type"]:checked');
    const type = radio ? radio.value : 'video';
    downloadStats.total++;
    if (type === 'video') downloadStats.videos++;
    else downloadStats.audios++;
    await window.electronAPI.setStoreValue('stats', downloadStats);
  }

  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch (_) {}
  }
});
