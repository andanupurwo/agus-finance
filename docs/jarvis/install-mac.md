# 🍎 Cara Install Jarvis di Mac (zsh)

1.  Buka Terminal.
2.  Buka file config zsh dengan perintah:
    ```bash
    nano ~/.zshrc
    ```
3.  Scroll ke paling bawah, lalu Copy & Paste kode berikut:

    ```bash
    # -------------------------------------------
    # 🤖 JARVIS ALIASES (Agus Finance Workflow)
    # -------------------------------------------
    echo "🤖 Jarvis aliases loaded!"

    # 1. jarvis-setup: Siapkan environment kerja (Sync Main -> Update)
    function jarvis-setup() {
        echo "🚀 Starting Jarvis Setup..."
        git checkout main
        git pull origin main
        git checkout update
        git merge main
        echo "✅ Workspace ready on 'update' branch!"
    }

    # 2. jarvis-in: Pindah ke mode kerja (Masuk ke branch Update)
    alias jarvis-in="git checkout update"

    # 3. jarvis-out: Simpan kerjaan (Commit & Push branch Update)
    function jarvis-out() {
        if [ -z "$1" ]; then
            echo "❌ Error: Please provide a commit message."
            echo "Usage: jarvis-out \"your message here\""
        else
            git add .
            git commit -m "$1"
            git push origin update
            echo "✅ Work saved and pushed to 'update'!"
        fi
    }

    # 4. jarvis-merge: Rilis fitur (Merge Update -> Main)
    function jarvis-merge() {
        echo "🚀 Merging 'update' to 'main'..."
        git checkout main
        git pull origin main
        git merge update
        git push origin main
        git checkout update
        echo "✅ Merged to main and back to workspace!"
    }
    # -------------------------------------------
    ```

4.  Simpan file:
    *   Tekan `Ctrl + O`, lalu `Enter`.
    *   Tekan `Ctrl + X` untuk keluar.

5.  Refresh terminal:
    ```bash
    source ~/.zshrc
    ```

Selesai! Sekarang perintah `jarvis-setup`, `jarvis-out` sudah bisa dipakai.
