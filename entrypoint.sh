#!/bin/sh
set -e

# Apply umask
umask ${UMASK:-002}

# Rewire container PORT to BUN_PORT for Bun runtime
export BUN_PORT="${BUN_PORT:-$PORT}"

export NODE_ENV="production"

# Run the CMD
exec "$@"
