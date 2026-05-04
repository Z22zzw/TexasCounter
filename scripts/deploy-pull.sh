#!/usr/bin/env bash
# 在腾讯云机器上由 systemd timer 或手动执行：git pull + compose 重建
# 使用方法（示例）：
#   sudo install -m755 scripts/deploy-pull.sh /opt/texas-counter/scripts/
#   cd /opt/texas-counter && ./scripts/deploy-pull.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker 未安装" >&2
  exit 1
fi

git pull --ff-only
docker compose up -d --build
docker image prune -f

echo "deploy-pull: ok"
