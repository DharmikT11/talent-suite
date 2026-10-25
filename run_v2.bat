@echo off
title RecruitAI Suite (v2) - Enterprise Launcher
echo ========================================================
echo   Starting RecruitAI Suite (v2) - Enterprise Platform   
echo ========================================================
echo.

:: Start FastAPI Server (which serves both React frontend & backend on port 8000)
echo Starting RecruitAI Server on http://localhost:8000...
start "RecruitAI Server" cmd /k "title RecruitAI Server && cd /d %~dp0v2\backend && ..\..\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

:: Start Cloudflare Tunnel pointing to port 8000
echo.
echo Starting Cloudflare Tunnel for public sharing...
start "Cloudflare Tunnel (RecruitAI)" cmd /k "title Cloudflare Tunnel && cd /d %~dp0 && cloudflared.exe tunnel --url http://localhost:8000"

echo.
echo ========================================================
echo   Platform is LIVE!
echo   - Local Access: http://localhost:8000
echo   - Public Access: Check the Cloudflare window for your link
echo ========================================================
pause
