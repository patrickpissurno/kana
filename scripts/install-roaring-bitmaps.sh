#!/usr/bin/env bash

set -euo pipefail

# --- Configuration ---
# Target database name (change if installing into a specific DB)
DB_NAME="${1:-kana}"
PG_CONFIG_PATH="$(brew --prefix postgresql@18 2>/dev/null)/bin/pg_config"

# Install Xcode Command Line Tools if not already present
# xcode-select --install

echo "==> Checking if PostgreSQL 18 is installed via Homebrew..."
if [[ ! -x "${PG_CONFIG_PATH}" ]]; then
    echo "Error: pg_config not found at ${PG_CONFIG_PATH}."
    echo "Please make sure postgresql@18 is installed via Homebrew."
    exit 1
fi

echo "==> Checking if 'roaringbitmap' extension is already enabled in database '${DB_NAME}'..."
IS_INSTALLED=$(psql -d "${DB_NAME}" -tAc "SELECT 1 FROM pg_extension WHERE extname = 'roaringbitmap';" 2>/dev/null || true)

if [[ "${IS_INSTALLED}" == "1" ]]; then
    echo "SUCCESS: 'roaringbitmap' extension is already installed and registered in database '${DB_NAME}'."
    exit 0
fi

echo "Extension not found in '${DB_NAME}'. Proceeding with build and installation..."

# Create a temporary directory on macOS and register a trap to ensure cleanup on exit/error
TMP_DIR=$(mktemp -d -t pg_roaringbitmap_build)
trap 'echo "==> Cleaning up temporary directory..."; rm -rf "${TMP_DIR}"' EXIT

echo "==> Created temporary build directory: ${TMP_DIR}"

# Clone repository into the temporary directory
echo "==> Fetching pg_roaringbitmap source..."
git clone --depth 1 https://github.com/patrickpissurno/pg_roaringbitmap.git "${TMP_DIR}"

cd "${TMP_DIR}"

echo "==> Compiling pg_roaringbitmap against PostgreSQL 18..."
# Build using native architecture optimizations on macOS (ARM64/x86_64 SIMD)
if [[ -f "Makefile_native" ]]; then
    make -f Makefile_native PG_CONFIG="${PG_CONFIG_PATH}"
else
    make PG_CONFIG="${PG_CONFIG_PATH}"
fi

echo "==> Installing binaries into Homebrew PostgreSQL directory..."
sudo make install PG_CONFIG="${PG_CONFIG_PATH}"

echo "==> Enabling 'roaringbitmap' extension in database '${DB_NAME}'..."
psql -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS roaringbitmap;"

echo "==> Verifying extension function..."
psql -d "${DB_NAME}" -c "SELECT rb_build(ARRAY[1, 2, 3, 4, 5]);"

echo "SUCCESS: 'roaringbitmap' installation complete!"