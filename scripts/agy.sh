#!/bin/bash

mkdir -p node_modules/.bin && ln -sf "$(which bun)" node_modules/.bin/node && PATH="$PWD/node_modules/.bin:/Library/Developer/CommandLineTools/usr/bin:$(echo "$PATH" | tr ':' '\n' | grep -v "^$HOME/.nvm" | paste -sd: -)" ai-jail agy --project kana ; rm node_modules/.bin/node
