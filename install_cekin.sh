#!/bin/bash

# Script Instalasi Perintah 'cekin'
# Keterangan: Script ini akan menanamkan fungsi 'cekin' ke terminal Anda (Zsh/Bash).
# Cara pakai di PC Baru:
# 1. Jalankan ./install_cekin.sh
# 2. Restart terminal atau jalankan 'source ~/.zshrc' (atau ~/.bashrc)

RC_FILE=""
if [ -f "$HOME/.zshrc" ]; then
    RC_FILE="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
    RC_FILE="$HOME/.bashrc"
else
    echo "❌ Tidak dapat menemukan .zshrc atau .bashrc. Silakan copy fungsi secara manual."
    exit 1
fi

echo "📦 Menambahkan fungsi 'cekin' ke $RC_FILE..."

# Cek apakah sudah ada untuk menghindari duplikasi
if grep -q "cekin()" "$RC_FILE"; then
    echo "⚠️  Fungsi 'cekin' sepertinya sudah ada di $RC_FILE."
    echo "    Script tidak akan menambahkannya lagi agar tidak duplikat."
else
    cat >> "$RC_FILE" << 'EOF'

# --- Added by Agus Finance Project Installer ---
# Sinkronisasi Total dengan GitHub (Hard Reset)
cekin() {
    echo "🔄 Memulai sinkronisasi total dengan GitHub (Hard Reset)..."
    
    # 1. Fetch & Prune
    git fetch --all --prune
    
    # Simpan nama branch saat ini agar bisa kembali
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    
    # 2. Reset setiap branch lokal yang ada di origin
    for branch in $(git for-each-ref --format='%(refname:short)' refs/heads/); do
        if git show-ref --verify --quiet refs/remotes/origin/$branch; then
            echo "⚡ Resetting branch '$branch' ke 'origin/$branch'..."
            git checkout $branch --quiet
            git reset --hard origin/$branch
        else
            echo "⚠️  Skip '$branch' (tidak ditemukan di GitHub/origin)"
        fi
    done
    
    # 3. Kembali ke branch semula
    git checkout $current_branch --quiet
    echo "✅ Selesai! Semua branch lokal sekarang kembar identik dengan GitHub."
}
# -----------------------------------------------
EOF
    echo "✅ Berhasil ditambahkan!"
fi

echo "👉 Untuk mengaktifkan, jalankan: source $RC_FILE"
