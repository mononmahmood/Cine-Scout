#!/bin/bash
cd "$(dirname "$0")/web"
if [ ! -d "node_modules" ]; then
  echo "First time setup, please wait..."
  npm install --silent
fi
echo "Starting Musepark..."
(npm run dev -- --host 127.0.0.1 --port 5173 &>/tmp/musepark.log &)
sleep 4
open http://localhost:5173/
echo "Musepark is open in your browser. Leave this window open while you use it."
wait
