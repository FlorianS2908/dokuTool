@echo off
cd /d "%~dp0"
echo Starte IHK DokuTool ...
echo.
if not defined PORT set "PORT=8080"
set "APP_URL=http://localhost:%PORT%"
echo URL: %APP_URL%
echo.
if not exist node_modules (
  echo node_modules fehlt. Bitte zuerst die Abhaengigkeiten installieren.
  echo Wenn npm installiert ist: npm install
  pause
  exit /b 1
)

set "NODE_EXE="
set "CODEX_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
where node >nul 2>nul
if %errorlevel%==0 set "NODE_EXE=node"

if not defined NODE_EXE if exist "%CODEX_NODE%" set "NODE_EXE=%CODEX_NODE%"

if not defined NODE_EXE (
  echo Node.js wurde nicht gefunden. Bitte Node.js LTS installieren:
  echo https://nodejs.org/
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$client = [Net.Sockets.TcpClient]::new(); try { $client.Connect('127.0.0.1', [int]$env:PORT); exit 0 } catch { exit 1 } finally { $client.Dispose() }" >nul 2>nul
if %errorlevel%==0 (
  echo Das DokuTool laeuft bereits auf %APP_URL%.
  echo Ich oeffne es jetzt im Browser.
  start "" "%APP_URL%"
  pause
  exit /b 0
)

echo Server startet. Dieses Fenster bitte offen lassen.
echo Browser wird geoeffnet, sobald der Server erreichbar ist ...
start "" powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "$url = $env:APP_URL; for ($i = 0; $i -lt 30; $i++) { $client = [Net.Sockets.TcpClient]::new(); try { $client.Connect('127.0.0.1', [int]$env:PORT); [Diagnostics.Process]::Start($url) | Out-Null; exit 0 } catch { Start-Sleep -Seconds 1 } finally { $client.Dispose() } }; [Diagnostics.Process]::Start($url) | Out-Null"

"%NODE_EXE%" server.js
echo.
echo Der Server wurde beendet oder konnte nicht gestartet werden.
echo Pruefe die Fehlermeldung direkt oberhalb.
pause
exit /b %errorlevel%
