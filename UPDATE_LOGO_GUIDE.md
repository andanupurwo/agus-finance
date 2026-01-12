# 🎨 UPDATE LOGO AGUS FINANCE

## 📍 Lokasi Logo di Aplikasi

Saya sudah mengidentifikasi **semua** lokasi yang menggunakan logo:

### 1. **File Logo (Critical)**
- `public/pwa-192x192.png` - Logo 192x192px untuk PWA home screen
- `public/pwa-512x512.png` - Logo 512x512px untuk PWA splash screen

### 2. **Login Page** 
- Component: `src/App.jsx` line 331
- Display size: 80x80px
- Source: `/pwa-192x192.png`

### 3. **PWA Configuration**
- File: `vite.config.js` lines 19-39
- Manifest sudah benar, hanya reference ke file PNG

---

## 🚀 Cara Update Logo

### Option 1: Automatic Resize (Recommended)
Gunakan script yang sudah saya buat:

```bash
cd "/Users/purwo/My Project/agus-finance"
./scripts/convert-logo.sh ~/path/to/your/logo.png
```

Script ini akan:
- ✅ Resize ke 192x192px
- ✅ Resize ke 512x512px
- ✅ Save ke folder `public/`

### Option 2: Manual Upload
1. Siapkan 2 file PNG:
   - `logo-192.png` (192x192 pixel)
   - `logo-512.png` (512x512 pixel)

2. Copy ke folder public:
   ```bash
   cp logo-192.png "/Users/purwo/My Project/agus-finance/public/pwa-192x192.png"
   cp logo-512.png "/Users/purwo/My Project/agus-finance/public/pwa-512x512.png"
   ```

---

## ✅ Verification Checklist

Setelah upload logo, jalankan:

```bash
cd "/Users/purwo/My Project/agus-finance"

# 1. Build
npm run build

# 2. Check file size (harus lebih besar dari placeholder)
ls -lh public/pwa-*.png

# 3. Deploy
firebase deploy --only hosting

# 4. Test
# - Buka https://agus-finance.web.app
# - Logo harus terlihat di login page
# - Test PWA install - icon harus logo baru
```

---

## 📊 Files Summary

| File | Lokasi | Size | Digunakan |
|------|--------|------|----------|
| pwa-192x192.png | `/public/` | 192x192px | Login page + PWA home |
| pwa-512x512.png | `/public/` | 512x512px | PWA splash screen |

---

## 🔄 Rollback (Jika Ada Masalah)

```bash
# File backup sudah ada
cp public/pwa-192x192.png.backup public/pwa-192x192.png
cp public/pwa-512x512.png.backup public/pwa-512x512.png
npm run build
firebase deploy --only hosting
```

---

## 📋 Status

✅ Semua lokasi sudah diidentifikasi  
✅ Backup file lama sudah dibuat  
✅ Script convert logo sudah siap  
✅ Siap untuk upload logo baru  

**Next:** Upload logo yang sudah Anda siapkan!
