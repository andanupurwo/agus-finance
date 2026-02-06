# 🪟 Cara Install Jarvis di Windows (PowerShell)

1.  Buka PowerShell.
2.  Cek apakah file profil sudah ada, ketik:
    ```powershell
    Test-Path $PROFILE
    ```
    *   Jika `False`, buat dulu dengan ketik: `New-Item -Type File -Force $PROFILE`
3.  Buka file profil dengan Notepad:
    ```powershell
    notepad $PROFILE
    ```
4.  Copy & Paste kode berikut ke dalam Notepad tersebut:

    ```powershell
    # -------------------------------------------
    # 🤖 JARVIS ALIASES (Agus Finance Workflow)
    # -------------------------------------------
    Write-Host "🤖 Jarvis aliases loaded!" -ForegroundColor Cyan

    # 1. jarvis-setup: Sync main ke update
    function Jarvis-Setup {
        Write-Host "🚀 Starting Jarvis Setup..." -ForegroundColor Green
        git checkout main
        git pull origin main
        git checkout update
        git merge main
        Write-Host "✅ Workspace ready on 'update' branch!" -ForegroundColor Green
    }

    # 2. jarvis-in: Pindah ke update
    function Jarvis-In {
        git checkout update
    }

    # 3. jarvis-out: Commit & Push (butuh pesan)
    function Jarvis-Out {
        param([string]$message)
        if (-not $message) {
            Write-Host "❌ Error: Butuh pesan commit." -ForegroundColor Red
            Write-Host "Usage: jarvis-out 'pesan kamu'" -ForegroundColor Yellow
            return
        }
        git add .
        git commit -m "$message"
        git push origin update
        Write-Host "✅ Work saved and pushed to 'update'!" -ForegroundColor Green
    }

    # 4. jarvis-merge: Gabung ke main
    function Jarvis-Merge {
        Write-Host "🚀 Merging 'update' to 'main'..." -ForegroundColor Cyan
        git checkout main
        git pull origin main
        git merge update
        git push origin main
        git checkout update
        Write-Host "✅ Merged to main and back to workspace!" -ForegroundColor Green
    }
    # -------------------------------------------
    ```

5.  Simpan Notepad (`Ctrl + S`) dan Tutup.
6.  Tutup PowerShell dan buka lagi.

Selesai! Sekarang perintah `jarvis-setup`, `jarvis-out` siap digunakan.
