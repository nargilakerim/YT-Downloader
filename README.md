# 📺 YouTube İndirici (YT-Downloader)

Modern, şık ve kullanıcı dostu bir YouTube video ve müzik indirme uygulaması. Electron.js ile geliştirilmiştir.

![App Screenshot](https://raw.githubusercontent.com/nargilakerim/YT-Downloader/main/assets/icon.png)

## ✨ Özellikler

*   **🎬 Video İndirme**: 4K, 1080p, 720p, 480p ve 360p kalite seçenekleri.
*   **🎵 Müzik İndirme**: Videoları otomatik olarak yüksek kaliteli MP3 formatına dönüştürür.
*   **📂 Ayrı İndirme Konumları**: Video ve müzikleriniz için farklı kayıt klasörleri belirleyebilirsiniz.
*   **📋 Playlist Desteği**: Tüm oynatma listesini tek tıkla analiz eder ve indirir.
*   **🌗 Tema Seçeneği**: Göz yormayan Premium Karanlık Mod ve modern Aydınlık Mod seçenekleri.
*   **🔄 Otomatik Güncelleme Kontrolü**: Yeni sürüm çıktığında bildirim alırsınız (v1.2.4+).
*   **📥 Tek Tıkla yt-dlp Kurulumu**: Ayarlardan "Otomatik İndir" butonu ile yt-dlp'yi kurabilirsiniz (v1.2.4+).
*   **🇹🇷 Tamamen Türkçe**: Kullanımı kolay, anlaşılır Türkçe arayüz.

## 📥 İndirme ve Kurulum

En son sürümü **[Releases](https://github.com/nargilakerim/YT-Downloader/releases)** sayfasından indirebilirsiniz.

1.  `YouTubeIndirici-Setup.exe` dosyasını indirin.
2.  Çift tıklayarak kurun.
3.  Uygulamayı açın.
4.  **Ayarlar** sayfasına gidin ve yt-dlp için **"Otomatik İndir"** butonuna basın.
5.  İndirmeye başlayın!

### 🔧 yt-dlp Manuel Kurulum (Alternatif)

Eğer otomatik indirme çalışmazsa:

1.  [yt-dlp Releases](https://github.com/yt-dlp/yt-dlp/releases) sayfasından `yt-dlp.exe` dosyasını indirin.
2.  Bilgisayarınızda `C:\Users\KULLANICI_ADINIZ\bin` klasörü oluşturun.
3.  İndirdiğiniz `yt-dlp.exe` dosyasını bu klasöre kopyalayın.
4.  Uygulamayı yeniden başlatın.

> **Not:** Uygulama otomatik olarak `%APPDATA%\youtube-indirici\bin` veya `%USERPROFILE%\bin` klasörlerinde yt-dlp'yi arar.

## 🛠️ Kullanılan Teknolojiler

*   **Electron**: Masaüstü uygulama çatısı.
*   **yt-dlp**: Güçlü indirme motoru.
*   **ffmpeg**: Medya dönüştürme işlemleri.
*   **Electron Forge**: Paketleme ve dağıtım.

## 📝 Sürüm Notları

### v1.2.4 (Güncel)
*   **YENİ**: Otomatik güncelleme kontrolü ve bildirim sistemi.
*   **YENİ**: Tek tıkla yt-dlp otomatik indirme özelliği.
*   **DÜZELTME**: Uygulama adı "Psycho" yerine "YouTube Indirici" olarak gösteriliyor.
*   **DÜZELTME**: Video indirmede ses sorunu giderildi (MP4 ses codec düzeltmesi).
*   **DÜZELTME**: webm formatı sorunu düzeltildi, artık her zaman MP4 olarak indirilir.

### v1.2.3
*   Video ve Ses indirmeleri için ayrı klasör seçebilme.
*   "Bitti" butonuna basıldığında yaşanan arayüz akış sorunları giderildi.

---
*made by nargilakerim • helped by AI*
