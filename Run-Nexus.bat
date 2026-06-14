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
set "CHROME_PROFILE=%~dp0resources\win_profile"

:: 2. Launch your compiled background servers silently
start /b "" "%NODE_BIN%" "%~dp0backend\dist\main.js"
set PORT=3000
set HOSTNAME=127.0.0.1
start /b "" "%NODE_BIN%" "%~dp0frontend\.next/standalone/frontend/server.js"

:: 3. Give background instances a brief moment to stabilize
timeout /t 3 /nobreak >nul

:: 4. Detect System Default Browser via Registry Choice
set "TARGET_BROWSER="
for /f "tokens=3" %%a in ('reg query "HKCU\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice" /v ProgId 2^>nul') do set "PROG_ID=%%a"

:: Map common compatible Chromium default engines
if "%PROG_ID%"=="ChromeHTML" set "TARGET_BROWSER=C:\Program Files\Google\Chrome\Application\chrome.exe"
if "%PROG_ID%"=="MSEdgeHTM"  set "TARGET_BROWSER=msedge"
if "%PROG_ID%"=="BraveHTML"   set "TARGET_BROWSER=brave"

:: If a compatible default browser was found, skip the fallback verification
if defined TARGET_BROWSER goto launch

:: 5. Fallback Chain (Runs only if default browser is Firefox or unidentifiable)
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "TARGET_BROWSER=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else (
    set "TARGET_BROWSER=msedge"
)

:launch
:: Launch in Normal Maximized App Mode and WAIT for the user to close it.
start /wait "" "%TARGET_BROWSER%" --app=http://127.0.0.1:3000/fr --start-maximized --window-size=1280,800 --user-data-dir="%CHROME_PROFILE%"

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