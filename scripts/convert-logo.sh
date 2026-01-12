#!/bin/bash
# Script untuk convert image ke ukuran yang sesuai untuk PWA icons

IMAGE_SOURCE="$1"
PROJECT_PATH="/Users/purwo/My Project/agus-finance"

if [ -z "$IMAGE_SOURCE" ]; then
    echo "Usage: ./convert-logo.sh <path-to-image>"
    echo ""
    echo "Example: ./convert-logo.sh ~/Downloads/agus-logo.png"
    exit 1
fi

if [ ! -f "$IMAGE_SOURCE" ]; then
    echo "Error: File '$IMAGE_SOURCE' not found"
    exit 1
fi

echo "Converting logo..."
echo "Source: $IMAGE_SOURCE"
echo ""

# Convert menggunakan ImageMagick (install jika belum ada)
command -v convert &> /dev/null || {
    echo "Installing ImageMagick..."
    brew install imagemagick
}

# Create 192x192
convert "$IMAGE_SOURCE" -resize 192x192 -background white -gravity center -extent 192x192 "$PROJECT_PATH/public/pwa-192x192.png"
echo "✓ Created pwa-192x192.png (192x192px)"

# Create 512x512
convert "$IMAGE_SOURCE" -resize 512x512 -background white -gravity center -extent 512x512 "$PROJECT_PATH/public/pwa-512x512.png"
echo "✓ Created pwa-512x512.png (512x512px)"

echo ""
echo "✓ Logo files converted successfully!"
echo ""
echo "Next steps:"
echo "  1. cd \"$PROJECT_PATH\""
echo "  2. npm run build"
echo "  3. firebase deploy --only hosting"
