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
# Cekot = Check Out (Save & Push to 'update' branch ONLY)
cekot() {
    echo "🚀 Memulai proses Cekot (Commit & Push to branch 'update')..."
    
    # 1. Simpan nama branch saat ini
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")

    # 2. Add All & Commit di branch saat ini (jika ada perubahan)
    if [ -n "$(git status --porcelain)" ]; then 
        echo "📝 Ada perubahan code, melakukan commit di branch '$current_branch'..."
        git add .
        git commit -m "Cekot [WIP]: $timestamp"
    else
        echo "✅ Branch '$current_branch' bersih (tidak ada perubahan baru)."
    fi

    # 3. Logika Push ke 'update'
    if [ "$current_branch" = "update" ]; then
        # Jika sudah di update, langsung push
        echo "📤 Sedang di branch 'update', langsung push ke origin..."
        git push origin update
    else
        # Jika bukan di update (misal di main atau fitur-x)
        echo "🔀 Sedang di '$current_branch'. Menggabungkan ke 'update'..."
        
        # Pindah ke update
        git checkout update 2>/dev/null || git checkout -b update
        
        # Pull dulu update terbaru dari server utk hindari konflik
        echo "⬇️  Mengambil update terbaru dari server..."
        git pull origin update --rebase 2>/dev/null
        
        # Merge perubahan dari branch awal tadi
        echo "🔗 Merging '$current_branch' ke 'update'..."
        git merge "$current_branch" -m "Merge from $current_branch (Cekot process)"
        
        # Push update ke server
        echo "📤 Uploading branch 'update' ke GitHub..."
        git push origin update
        
        # Kembali ke branch asal
        echo "🔙 Kembali ke branch asal '$current_branch'..."
        git checkout "$current_branch"
    fi
    
    echo "✅ Selesai! Pekerjaan Anda sudah aman di branch 'update'."
    echo "🔒 Branch 'main' TIDAK disentuh/push. Silakan Merge PR manual di rumah."
}
# -----------------------------------------------
EOF
    echo "✅ Berhasil ditambahkan!"
fi

echo "👉 Untuk mengaktifkan, jalankan: source $RC_FILE"
