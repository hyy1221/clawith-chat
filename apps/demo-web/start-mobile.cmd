@echo off
setlocal
cd /d D:\code\Clawith\Clawith\open-chat
"D:\tools\nodejs\pnpm.cmd" --filter demo-web dev --host 0.0.0.0 --port 5173 >> D:\code\Clawith\Clawith\open-chat\vite-mobile.log 2>&1
