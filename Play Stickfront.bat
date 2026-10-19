@echo off
rem Starts Stickfront: checks GitHub for an update (and offers to install it), then opens the game
rem in its own Microsoft Edge app window. Same as the desktop shortcut the setup makes.
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0launcher\launch.ps1"
