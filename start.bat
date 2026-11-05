@echo off
rem start.bat - Double-click or run from CMD to launch all services in a new terminal
title Enterprise Bulk Processor Launcher
start "Enterprise Bulk Processor" powershell.exe -NoExit -ExecutionPolicy Bypass -File "%~dp0scripts\orchestrator.ps1"

