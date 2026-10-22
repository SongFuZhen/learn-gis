#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
export CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
URL="$1"
OUT="$2"
npx --yes lighthouse@latest "$URL" \
  --preset=desktop \
  --chrome-path="$CHROME_PATH" \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
  --output=json \
  --output-path="$OUT"
node -e "const fs=require('fs'); const r=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); const o={}; for(const k in r.categories){o[k]=Math.round(r.categories[k].score*100);} console.log(JSON.stringify(o));" "$OUT"
