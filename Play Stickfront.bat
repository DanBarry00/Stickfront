@echo off
rem Launches Stickfront in its own Microsoft Edge app window (no browser tabs/toolbars).
setlocal
set "GAME=%~dp0game\index.html"
set "URL=file:///%GAME:\=/%"
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE%" (
  start "" "%EDGE%" --app="%URL%" --start-maximized
) else (
  start "" "%GAME%"
)
