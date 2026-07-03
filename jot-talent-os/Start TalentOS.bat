@echo off
title JOT TalentOS
cd /d "%~dp0"
echo Starting JOT TalentOS...
echo Keep this window open while you use the app. Close it to stop.
start "" /min cmd /c "timeout /t 2 >nul & start http://localhost:4820"
node server.js
pause
