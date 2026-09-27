#!/bin/bash
# Claude Code on the web 用: 依存関係のインストールと、検証ツール（Playwright / agent-browser）の環境変数設定
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"
pnpm install --frozen-lockfile

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  # プリインストール済み Chromium を agent-browser に使わせる
  chrome=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -n 1 || true)
  if [ -n "$chrome" ]; then
    echo "export AGENT_BROWSER_EXECUTABLE_PATH=$chrome" >> "$CLAUDE_ENV_FILE"
  fi
  # next/font が Google Fonts を取得する際に HTTPS_PROXY を経由させる
  if [ -n "${HTTPS_PROXY:-}" ]; then
    echo "export NODE_USE_ENV_PROXY=1" >> "$CLAUDE_ENV_FILE"
  fi
fi
