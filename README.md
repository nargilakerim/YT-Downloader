# 🎬 Medya İndirici (Media Downloader)

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
- **Video İndirme**: 4K, 1080p, 720p, 480p ve 360p kalite seçenekleri
- **Müzik İndirme**: Videoları otomatik olarak yüksek kaliteli MP3 formatına dönüştürür
- **Özel Dosya Adı**: İndirmeden önce dosya adını değiştirebilirsiniz
- **Türkçe Karakter Desteği**: Dosya adlarında ş, ğ, ü, ö, ç, ı karakterleri düzgün çalışır

### 📂 Klasör Yönetimi
- Video ve müzikleriniz için **ayrı kayıt klasörleri** belirleyebilirsiniz
- Varsayılan olarak İndirilenler klasörünü kullanır

### 📋 Playlist Desteği
- YouTube oynatma listelerini tek tıkla analiz eder
- Tüm videoları sırayla indirir

### 🎨 Kullanıcı Arayüzü
- **Premium Karanlık Mod**: Göz yormayan şık tasarım
- **Aydınlık Mod**: Modern ve temiz görünüm
- **Gerçek Zamanlı İlerleme**: İndirme hızı ve kalan süre gösterimi
- **Konfeti Animasyonu**: İndirme tamamlandığında kutlama efekti 🎉
- **Ses Bildirimi**: İndirme bittiğinde sesli uyarı

### 📊 İstatistikler ve Geçmiş
- Toplam indirme sayısı
- İndirilen video/müzik sayıları
- Toplam indirilen veri boyutu
- İndirme geçmişi görüntüleme
- Geçmiş filtreleme (tümü/video/müzik)

### ⌨️ Klavye Kısayolları
- `Ctrl+V` ile URL otomatik yapıştırma
- `Enter` ile hızlı getirme

### 🔄 Güncelleme Sistemi
- **Otomatik Güncelleme Kontrolü**: Yeni sürüm çıktığında bildirim
- **Tek Tıkla Güncelleme**: Uygulama içinden güncelleme indirme ve kurma
- **yt-dlp Otomatik Güncelleme**: Ayarlardan tek tıkla yt-dlp güncelleyebilirsiniz

### 🇹🇷 Tamamen Türkçe
Tüm arayüz ve mesajlar Türkçe olarak hazırlanmıştır.

---

## 📥 İndirme ve Kurulum

En son sürümü **[Releases](https://github.com/nargilakerim/YT-Downloader/releases)** sayfasından indirebilirsiniz.

1. `YouTubeIndirici-Setup.exe` dosyasını indirin
2. Çift tıklayarak kurun
3. Uygulamayı açın
4. **Ayarlar** sayfasına gidin ve yt-dlp için **"Otomatik İndir"** butonuna basın
5. İndirmeye başlayın!

### 🔧 yt-dlp Manuel Kurulum (Alternatif)

Eğer otomatik indirme çalışmazsa:

1. [yt-dlp Releases](https://github.com/yt-dlp/yt-dlp/releases) sayfasından `yt-dlp.exe` dosyasını indirin
2. Bilgisayarınızda `C:\Users\KULLANICI_ADINIZ\bin` klasörü oluşturun
3. İndirdiğiniz `yt-dlp.exe` dosyasını bu klasöre kopyalayın
4. Uygulamayı yeniden başlatın

> **Not:** Uygulama otomatik olarak `%APPDATA%\youtube-indirici\bin` veya `%USERPROFILE%\bin` klasörlerinde yt-dlp'yi arar.

---

## 🛠️ Kullanılan Teknolojiler

- **Electron**: Masaüstü uygulama çatısı
- **yt-dlp**: Güçlü indirme motoru
- **ffmpeg**: Medya dönüştürme işlemleri
- **Electron Forge**: Paketleme ve dağıtım

---

## 📝 Sürüm Notları

### v1.4.2 (Güncel)
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
