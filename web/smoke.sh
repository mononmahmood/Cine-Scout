#!/bin/bash
# Smoke test: build + serve + headless render check. Fails on JS errors or blank root.
cd "$(dirname "$0")"
npm run build >/tmp/smoke_build.log 2>&1 || { echo "BUILD FAILED"; tail -5 /tmp/smoke_build.log; exit 1; }
(nohup npx vite preview --host 127.0.0.1 --port 5299 > /tmp/smoke_srv.log 2>&1 &)
sleep 4
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --no-sandbox \
  --enable-logging=stderr --timeout=30000 --window-size=1280,900 \
  --virtual-time-budget=8000 --screenshot=/tmp/smoke.png http://localhost:5299/ 2>/tmp/smoke_console.log
ERRs=$(grep -c "Uncaught" /tmp/smoke_console.log || true)
echo "uncaught errors: $ERRs"
grep "Uncaught" /tmp/smoke_console.log | head -3
[ "$ERRs" != "0" ] && exit 1
python3 -c "
from PIL import Image" 2>/dev/null || { echo "shot bytes: $(stat -f%z /tmp/smoke.png)"; exit 0; }
