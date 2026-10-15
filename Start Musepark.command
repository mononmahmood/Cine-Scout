#!/bin/bash
cd "$(dirname "$0")/web"
if [ ! -d "node_modules" ]; then
  echo "First time setup, please wait..."
  npm install --silent
fi
if curl -s -o /dev/null --max-time 3 http://localhost:5173/; then
  echo "Cine Scout is already running."
else
  echo "Starting Cine Scout..."
  (nohup npm run dev -- --host 127.0.0.1 --port 5173 > /tmp/cinescout.log 2>&1 &)
  sleep 5
fi
open http://localhost:5173/
echo "Cine Scout is open in your browser. Keep this window open while you use it."
