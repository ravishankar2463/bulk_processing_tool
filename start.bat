@echo off
rem start.bat - Double-click or run from CMD to launch all services in a new terminal
title Enterprise Bulk Processor Launcher
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"

