# Workflow Development & Deployment

## Overview

Anda punya 2 environment:

| Branch | Firebase Project | Hosting URL | Gunakan Untuk |
|--------|-----------------|-------------|---------------|
| `main` | `agus-finance` | https://agus-finance.web.app | **PRODUCTION** (User pakai) |
| `dev` | `dev-agus-finance` | https://dev-agus-finance.web.app | **STAGING/TESTING** (Testing saja) |

---

## Workflow Step by Step

### 1️⃣ Kerja di Branch Development

```bash
# Pastikan Anda di branch dev
git checkout dev

# Buat fitur baru atau fix bug
# ... edit file ...

# Commit dan push
git add .
git commit -m "Fix: bug xyz atau Feat: tambah fitur abc"
git push origin dev
```

### 2️⃣ Deploy ke Dev Environment untuk Testing

```bash
# Pastikan Anda masih di branch dev
git checkout dev

# Deploy ke dev-agus-finance.web.app
npm run build
firebase use dev
firebase deploy --only hosting

# Atau pakai script helper (lebih mudah):
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**Script akan otomatis:**
- Detect branch Anda (dev atau main)
- Switch ke Firebase project yang tepat
- Build dan deploy

### 3️⃣ Testing di Dev

- Buka https://dev-agus-finance.web.app
- Test fitur baru atau fix yang sudah dibuat
- Jika ada error, kembali ke step 1, fix, dan deploy lagi

### 4️⃣ Setelah Testing BERHASIL - Merge ke Production

```bash
# Pastikan dev branch sudah push
git checkout dev
git push origin dev

# Switch ke main branch
git checkout main
git pull origin main

# Merge dev ke main
git merge dev

# Push ke GitHub
git push origin main
```

### 5️⃣ Deploy ke Production

```bash
# Pastikan Anda di branch main
git checkout main

# Deploy ke agus-finance.web.app (PRODUCTION)
npm run build
firebase use default
firebase deploy --only hosting

# Atau pakai script helper:
./scripts/deploy.sh
```

**Script akan otomatis:**
- Detect Anda di branch main
- Switch ke Firebase production project
- Build dan deploy

---

## Quick Reference Commands

### Switching Branch
```bash
git checkout dev      # Ke development
git checkout main     # Ke production
```

### Check Current Branch
```bash
git branch -a
```

### Deploy (Auto-detect branch)
```bash
./scripts/deploy.sh
```

### Deploy Manual (Jika prefer manual)

**Untuk dev:**
```bash
firebase use dev
npm run build
firebase deploy --only hosting
```

**Untuk production:**
```bash
firebase use default
npm run build
firebase deploy --only hosting
```

---

## Important Notes ⚠️

1. **SELALU di branch `dev` saat develop** - Jangan kerja di `main`
2. **Test di dev-agus-finance.web.app dulu** sebelum merge ke main
3. **Setelah merge ke main, langsung deploy** - Jangan ketinggalan
4. **Production adalah versi yang user pakai** - Hati-hati saat deploy ke production

---

## Jika Ada Emergency (Production Error)

```bash
# 1. Revert main ke commit sebelumnya
git revert <commit-id>
git push origin main

# 2. Deploy revert
firebase use default
npm run build
firebase deploy --only hosting

# 3. Fix di branch dev
git checkout dev
# ... fix bug ...

# 4. Test di dev-agus-finance.web.app

# 5. Merge dan deploy lagi
```

---

## Setup Environment Variables

File `.env.local` sudah ter-setup dengan 2 environment:

- `VITE_ENVIRONMENT=dev` → Pakai Firebase dev config
- `VITE_ENVIRONMENT=prod` → Pakai Firebase prod config

Script `deploy.sh` akan otomatis set nilai yang tepat berdasarkan branch.
