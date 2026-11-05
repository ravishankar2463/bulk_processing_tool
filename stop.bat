@echo off
rem stop.bat - Stops all backend, frontend, and Docker container services
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop.ps1"

