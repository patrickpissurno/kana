#!/usr/bin/env bash

# Note: Install Xcode Command Line Tools if not already present
# xcode-select --install

set -euo pipefail

# --- Configuration & Input ---
DB_NAME="${1:-kana}"

# --- OS & Architecture Detection ---
OS_NAME=$(uname -s)
ARCH_NAME=$(uname -m)

echo "==> Detected OS: ${OS_NAME} (${ARCH_NAME})"

# --- Locate pg_config ---
PG_CONFIG_PATH=""

if [[ "${OS_NAME}" == "Darwin" ]]; then
    # macOS - check Homebrew path first, fallback to system PATH
    BREW_PG_CONFIG="$(brew --prefix postgresql@18 2>/dev/null)/bin/pg_config"
    if [[ -x "${BREW_PG_CONFIG}" ]]; then
        PG_CONFIG_PATH="${BREW_PG_CONFIG}"
    elif command -v pg_config >/dev/null 2>&1; then
        PG_CONFIG_PATH=$(command -v pg_config)
    fi
elif [[ "${OS_NAME}" == "Linux" ]]; then
    # Linux - check PG 18 default path first, fallback to PATH
    if [[ -x "/usr/lib/postgresql/18/bin/pg_config" ]]; then
        PG_CONFIG_PATH="/usr/lib/postgresql/18/bin/pg_config"
    elif command -v pg_config >/dev/null 2>&1; then
        PG_CONFIG_PATH=$(command -v pg_config)
    fi
else
    echo "Error: Unsupported operating system '${OS_NAME}'."
    exit 1
fi

if [[ -z "${PG_CONFIG_PATH}" ]]; then
    echo "Error: Could not find 'pg_config'."
    echo "Please ensure PostgreSQL 18 development files are installed:"
    echo "  - macOS: brew install postgresql@18"
    echo "  - Debian/Ubuntu: apt install postgresql-server-dev-18"
    echo "  - RHEL/Fedora: dnf install postgresql18-devel"
    exit 1
fi

echo "==> Using pg_config: ${PG_CONFIG_PATH}"

# --- Check Extension Status ---
echo "==> Checking if 'roaringbitmap' is already registered in database '${DB_NAME}'..."
IS_INSTALLED=$(psql -d "${DB_NAME}" -tAc "SELECT 1 FROM pg_extension WHERE extname = 'roaringbitmap';" 2>/dev/null || true)

if [[ "${IS_INSTALLED}" == "1" ]]; then
    echo "SUCCESS: 'roaringbitmap' extension is already installed and enabled in '${DB_NAME}'."
    exit 0
fi

echo "Extension not found in '${DB_NAME}'. Proceeding with build..."

# --- Portable mktemp Syntax ---
if [[ "${OS_NAME}" == "Darwin" ]]; then
    TMP_DIR=$(mktemp -d -t pg_roaringbitmap_build)
else
    TMP_DIR=$(mktemp -d -t pg_roaringbitmap_build.XXXXXX)
fi

# Ensure temporary directory cleanup regardless of script outcome
trap 'echo "==> Cleaning up temporary directory..."; rm -rf "${TMP_DIR}"' EXIT

echo "==> Created temporary build directory: ${TMP_DIR}"

# --- Source Download & Build ---
echo "==> Cloning pg_roaringbitmap repository..."
git clone --depth 1 https://github.com/patrickpissurno/pg_roaringbitmap.git "${TMP_DIR}"

cd "${TMP_DIR}"

echo "==> Compiling extension..."
if [[ -f "Makefile_native" ]]; then
    make -f Makefile_native PG_CONFIG="${PG_CONFIG_PATH}"
else
    make PG_CONFIG="${PG_CONFIG_PATH}"
fi

echo "==> Installing extension files..."
if [[ $(id -u) -eq 0 ]]; then
    make install PG_CONFIG="${PG_CONFIG_PATH}"
else
    sudo make install PG_CONFIG="${PG_CONFIG_PATH}"
fi

# --- Registration & Verification ---
echo "==> Registering extension in database '${DB_NAME}'..."
psql -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS roaringbitmap;"

echo "==> Verifying extension installation..."
psql -d "${DB_NAME}" -c "SELECT rb_build(ARRAY[1, 2, 3, 4, 5]);"

echo "SUCCESS: 'roaringbitmap' build and installation complete on ${OS_NAME}!"
