@echo off
cd /d "%~dp0"
echo Starte IHK DokuTool ...
echo.
if not defined PORT set "PORT=8080"
echo URL: http://localhost:%PORT%
echo.
if not exist node_modules (
  echo node_modules fehlt. Bitte zuerst die Abhaengigkeiten installieren.
  echo Wenn npm installiert ist: npm install
  pause
  exit /b 1
)

where npm >nul 2>nul
if %errorlevel%==0 (
  npm start
  pause
  exit /b %errorlevel%
)

where node >nul 2>nul
if %errorlevel%==0 (
  node server.js
  pause
  exit /b %errorlevel%
)

set "CODEX_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%CODEX_NODE%" (
  "%CODEX_NODE%" server.js
  pause
  exit /b %errorlevel%
)

echo Node.js wurde nicht gefunden. Bitte Node.js LTS installieren:
echo https://nodejs.org/
pause
exit /b 1
