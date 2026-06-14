@echo off
title Nexus Engine
echo Starting Nexus Core Services...

:: Pin execution context to the batch file location
cd /d "%~dp0"

:: 1. Pre-launch cleanup (Ensure ports are completely free)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /f /pid %%a >nul 2>&1

:: Define paths
set "NODE_BIN=%~dp0resources\node\node.exe"
set "CHROME_PROFILE=%~dp0resources\browser_profile"

:: 2. Launch your compiled background servers silently
start /b "" "%NODE_BIN%" "%~dp0backend\dist\main.js"
set PORT=3000
set HOSTNAME=127.0.0.1
start /b "" "%NODE_BIN%" "%~dp0frontend\.next/standalone/frontend/server.js"

:: 3. Give background instances a brief moment to stabilize
timeout /t 3 /nobreak >nul

:: 4. Launch in Normal Maximized App Mode and WAIT for the user to close it.
:: --start-maximized ensures it fills the screen safely without hiding the taskbar.
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start /wait "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:3000/fr --start-maximized --user-data-dir="%CHROME_PROFILE%"
) else (
    start /wait "" msedge --app=http://127.0.0.1:3000/fr --start-maximized --user-data-dir="%CHROME_PROFILE%"
)

:: =====================================================================
:: 🚀 LIFECYCLE CLEANUP TRIGGERED
:: This section runs AUTOMATICALLY the moment the browser window is closed.
:: =====================================================================
echo.
echo Browser session terminated. Cleaning up local server engines...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /f /pid %%a >nul 2>&1

echo Cleanup complete. Safe to eject.
timeout /t 1 /nobreak >nul
exit