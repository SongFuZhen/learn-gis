#!/usr/bin/env bash
# 对单个路由跑真实 Lighthouse（desktop preset），输出各分类得分（JSON 一行）。
#
# 用法：
#   bash scripts/run-lighthouse.sh <url> [输出文件.json]
#   例：bash scripts/run-lighthouse.sh http://localhost:3000/review
#
# 默认输出 lh-report.json（已被 .gitignore 覆盖）。
# 依赖本机 Chrome，非默认安装位置时用 CHROME_PATH 环境变量覆盖。
set -euo pipefail
cd "$(dirname "$0")/.."

URL="${1:?用法: run-lighthouse.sh <url> [输出文件.json]}"
OUT="${2:-lh-report.json}"
CHROME="${CHROME_PATH:-/c/Program Files/Google/Chrome/Application/chrome.exe}"

npx --yes lighthouse@latest "$URL" \
  --preset=desktop \
  --chrome-path="$CHROME" \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
  --output=json \
  --output-path="$OUT" >/dev/null

node -e "const fs=require('fs'); const r=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); const o={}; for(const k in r.categories){o[k]=Math.round(r.categories[k].score*100);} console.log(JSON.stringify(o));" "$OUT"
