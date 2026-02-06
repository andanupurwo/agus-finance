#!/bin/bash

# Script Instalasi Perintah 'cekot' (Check-Out)
# Keterangan: Script ini akan menanamkan fungsi 'cekot' ke terminal Anda.
# Fungsi ini melakukan: Git Add All + Commit Timestamp + Push
# Cara pakai:
# 1. Jalankan ./install_cekot.sh
# 2. Restart terminal atau 'source ~/.zshrc'
# 3. Ketik 'cekot' saat ingin save & push kerjaan.

RC_FILE=""
if [ -f "$HOME/.zshrc" ]; then
    RC_FILE="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
    RC_FILE="$HOME/.bashrc"
else
    echo "❌ Tidak dapat menemukan .zshrc atau .bashrc."
    exit 1
fi

echo "📦 Menambahkan fungsi 'cekot' ke $RC_FILE..."

if grep -q "cekot()" "$RC_FILE"; then
    echo "⚠️  Fungsi 'cekot' sudah ada. Melewati instalasi."
else
    cat >> "$RC_FILE" << 'EOF'

# --- Added by Agus Finance Project Installer ---
# Cekot = Check Out (Save & Push)
cekot() {
    echo "🚀 Memulai proses Cekot (Commit & Push)..."
    
    # 1. Cek status
    if [ -z "$(git status --porcelain)" ]; then 
        echo "Example: Working tree clean. Nothing to commit."
        # Lanjut push untuk memastikan lokal branch ke-update ke remote jika ada beda commit lokal
        # Tapi biasanya user pakai ini setelah edit file.
    else
        # 2. Add All
        git add .
        
        # 3. Commit dengan Timestamp
        local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
        git commit -m "Cekot: $timestamp"
    fi

    # 4. Push ke remote (branch saat ini)
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    echo "📤 Uploading branch '$current_branch' ke GitHub..."
    git push origin HEAD
    
    echo "✅ Selesai! Semua perubahan sudah aman di GitHub."
}
# -----------------------------------------------
EOF
    echo "✅ Berhasil ditambahkan!"
fi

echo "👉 Untuk mengaktifkan, jalankan: source $RC_FILE"
