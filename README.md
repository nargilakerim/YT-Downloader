# 🎬 Media Downloader

Modern, şık ve kullanıcı dostu bir **çoklu platform** video ve müzik indirme uygulaması. YouTube, Instagram, TikTok, Twitter ve daha fazlası!

![App Screenshot](https://raw.githubusercontent.com/nargilakerim/YT-Downloader/main/assets/icon.png)

## ✨ Özellikler

### 🌐 Çoklu Platform Desteği
Tek uygulama ile birçok platformdan indirme yapabilirsiniz:

| Platform | Video | Müzik | Durum |
|----------|-------|-------|-------|
| YouTube | ✅ | ✅ | Stabil |
| Instagram (Reels, Story, Post) | ✅ | ✅ | Stabil |
| TikTok | ✅ | ✅ | Stabil |
| Twitter/X | ✅ | ✅ | Stabil |
| Reddit | ✅ | ✅ | Stabil |
| Twitch (Clips) | ✅ | ✅ | Stabil |
| Vimeo | ✅ | ✅ | Stabil |
| SoundCloud | ❌ | ✅ | Stabil |
| Facebook | ✅ | ✅ | Değişken |
| Pinterest | ✅ | ❌ | Değişken |

### 🎬 İndirme Özellikleri
- **Video İndirme**: 4K (2160p), 2K (1440p), 1080p, 720p, 480p ve 360p kalite seçenekleri
- **Müzik İndirme**: FFmpeg motoru ile 320kbps kayıpsız MP3 ve gömülü albüm kapağı desteği
- **Özel Dosya Adı**: İndirmeden önce dosya adını değiştirebilirsiniz
- **Türkçe Karakter Desteği**: Dosya adlarında ş, ğ, ü, ö, ç, ı karakterleri düzgün çalışır

### ⚙️ Çift Motor Sistemi (Core Engines)
- **yt-dlp Motoru**: 1000'den fazla platformdan video/ses akışlarını çeken ana indirme motoru
- **FFmpeg Motoru**: MP3 dönüştürme ve 1080p/4K DASH video akışlarını birleştirme için zorunlu motor
- Her iki motor da uygulama içi **Ayarlar** sayfasından tek tıkla otomatik olarak indirilebilir ve güncellenebilir
- Başlık çubuğunda **canlı motor hazır durum göstergesi** (yeşil/kırmızı rozet)

### 📂 Klasör Yönetimi
- Video ve müzikleriniz için **ayrı kayıt klasörleri** belirleyebilirsiniz
- Varsayılan olarak İndirilenler klasörünü kullanır

### 📋 Playlist Desteği
- YouTube oynatma listelerini tek tıkla analiz eder
- Tüm videoları sırayla indirir

### 🎨 Kullanıcı Arayüzü
- **Modern Glassmorphism Tasarım**: Cam efekti ve gradient vurgularla premium görünüm
- **Karanlık & Aydınlık Mod**: Göz yormayan şık tasarım ile modern temiz görünüm arasında tek tıkla geçiş
- **Gerçek Zamanlı İlerleme**: İndirme hızı (MB/s) ve kalan süre gösterimi
- **Platform Rozet Çubukları**: Desteklenen platformları renkli chip'lerle görsel listesi
- **İnteraktif Format Seçici**: Video (MP4) ve Ses (MP3) seçimi kart tabanlı arayüz ile
- **Ses Bildirimi**: İndirme bittiğinde sesli uyarı

### 📊 İstatistikler ve Geçmiş
- Toplam indirme sayısı
- İndirilen video/müzik sayıları
- İndirme geçmişi görüntüleme
- Geçmiş filtreleme (tümü/video/müzik)

### ⌨️ Klavye Kısayolları
- `Ctrl+V` ile URL otomatik yapıştırma ve anında getirme
- `Enter` ile hızlı getirme
- Arayüzdeki **Yapıştır** butonu ile panodan tek tıkla yapıştırma

### 🔄 Güncelleme Sistemi
- **Otomatik Güncelleme Kontrolü**: Yeni sürüm çıktığında bildirim
- **Tek Tıkla Güncelleme**: Uygulama içinden güncelleme indirme ve kurma
- **yt-dlp Otomatik Güncelleme**: Ayarlardan tek tıkla yt-dlp güncelleyebilirsiniz
- **FFmpeg Otomatik Kurulum**: Ayarlardan tek tıkla FFmpeg motorunu yükleyebilirsiniz

### 🇹🇷 Tamamen Türkçe
Tüm arayüz ve mesajlar Türkçe olarak hazırlanmıştır.

---

## 📥 İndirme ve Kurulum

En son sürümü **[Releases](https://github.com/nargilakerim/YT-Downloader/releases)** sayfasından indirebilirsiniz.

1. `MediaDownloader-Setup.exe` dosyasını indirin
2. Çift tıklayarak kurun
3. Uygulamayı açın
4. **Ayarlar** sayfasına gidin ve **"FFmpeg Otomatik Kur"** butonuna basın *(MP3 ve 1080p+ için zorunlu)*
5. Aynı sayfadan **"yt-dlp Güncelle / İndir"** butonuna da basın
6. İndirmeye başlayın!

### 🔧 yt-dlp ve FFmpeg Manuel Kurulum (Alternatif)

Eğer otomatik indirme çalışmazsa:

1. [yt-dlp Releases](https://github.com/yt-dlp/yt-dlp/releases) sayfasından `yt-dlp.exe` dosyasını indirin
2. [FFmpeg Builds](https://github.com/yt-dlp/FFmpeg-Builds/releases/latest) sayfasından `ffmpeg-master-latest-win64-gpl.zip` indirin
3. Her iki dosyayı `%APPDATA%\youtube-indirici\bin` klasörüne kopyalayın
4. Uygulamayı yeniden başlatın

> **Not:** Uygulama otomatik olarak `%APPDATA%\youtube-indirici\bin` veya `%USERPROFILE%\bin` klasörlerinde yt-dlp ve ffmpeg'i arar.

---

## 🛠️ Kullanılan Teknolojiler

- **Electron**: Masaüstü uygulama çatısı
- **yt-dlp**: Güçlü çok platform indirme motoru
- **FFmpeg**: Kayıpsız medya dönüştürme ve akış birleştirme
- **Electron Forge**: Paketleme ve dağıtım
- **Plus Jakarta Sans**: Modern tipografi

---

## 📝 Sürüm Notları

### v1.5.0 (Güncel) — Media Downloader
- **YENİ**: Uygulama ismi **Media Downloader** olarak güncellendi
- **YENİ**: **FFmpeg motoru otomatik kurulum** desteği — tek tıkla Ayarlar'dan kurulur
- **DÜZELTME**: **MP3 indirme hatası kesin olarak çözüldü** — FFmpeg tam entegrasyonu
- **DÜZELTME**: **Bellek sızıntısı giderildi** — Event listener'lar artık tekrarlı bağlanmıyor
- **DÜZELTME**: **İndirme iptali iyileştirildi** — Windows'ta arka planda kalan yt-dlp süreçleri `taskkill` ile temizleniyor
- **DÜZELTME**: **Gelişmiş hata mesajları** — Bot koruması, yaş kısıtlaması ve FFmpeg eksikliği gibi hatalar artık kullanıcıya Türkçe olarak gösteriliyor
- **YENİ**: **Çift motor durum rozeti** — Başlık çubuğunda yt-dlp ve FFmpeg hazır durumu anlık gösteriliyor
- **YENİ**: **Modern Glassmorphism Arayüz** — Yeni tipografi, kart tabanlı format seçici, platform rozetleri
- **YENİ**: **Panodan Yapıştır butonu** — Bağlantıyı tek tıkla yapıştırıp anında getirme
- **YENİ**: **YouTube bot koruması geçişi** — `player_client=android,web` ile daha stabil indirme

### v1.4.2
- **YENİ**: Çoklu platform desteği (Instagram, TikTok, Twitter, Reddit, vb.)
- **YENİ**: Özel dosya adı belirleme özelliği
- **DÜZELTME**: Türkçe büyük harf karakterleri (İ, Ğ, Ü, Ş, Ö, Ç) dosya adlarında sorun yaratmıyor
- **DÜZELTME**: `--js-runtimes` uyarısı kaldırıldı
- **DÜZELTME**: Instagram ve diğer platformlar için gelişmiş thumbnail desteği
- **DÜZELTME**: Hata mesajları temizlendi (gereksiz WARNING satırları kaldırıldı)

### v1.3.1
- **DÜZELTME**: System tray özelliği kaldırıldı (uygulama artık arka planda kalmıyor)
- **DÜZELTME**: Türkçe karakter desteği iyileştirildi

### v1.3.0
- **DÜZELTME**: Birden fazla dosya oluşma sorunu giderildi
- **DÜZELTME**: Temp dosyaları otomatik temizleniyor

### v1.2.7
- **YENİ**: İndirme hızı ve kalan süre gösterimi
- **YENİ**: Konfeti animasyonu
- **YENİ**: Ses bildirimi
- **YENİ**: Detaylı istatistikler
- **YENİ**: Geçmiş filtreleme

### v1.2.4
- **YENİ**: Otomatik güncelleme kontrolü
- **YENİ**: Tek tıkla yt-dlp kurulumu
- **DÜZELTME**: MP4 ses codec düzeltmesi

---

## 📸 Ekran Görüntüleri

*Yakında eklenecek*

---

## 🐛 Bilinen Sorunlar

- **Dailymotion**: yt-dlp tarafından geçici olarak desteklenmiyor
- **Snapchat**: Genellikle çalışmıyor
- **Instagram Thumbnail**: Bazı videolarda küçük resim görünmeyebilir (CORS kısıtlaması)

---

*made by nargilakerim • helped by AI*
