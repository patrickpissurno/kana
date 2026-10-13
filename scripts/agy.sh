#!/bin/bash

# 1. Setup temporary node alias
mkdir -p node_modules/.bin
ln -sf "$(which bun)" node_modules/.bin/node

# 2. Strip .nvm from the current PATH
CLEAN_PATH=$(echo "$PATH" | tr ':' '\n' | grep -v "^$HOME/.nvm" | paste -sd: -)

# 3. Execute jailed command with inline PATH assignment
PATH="$PWD/node_modules/.bin:/Library/Developer/CommandLineTools/usr/bin:$CLEAN_PATH" \
  ai-jail agy --project kana

# 4. Cleanup
rm node_modules/.bin/node
