@echo off
REM Double-click launcher for the P2P dev environment.
REM Runs the PowerShell menu without changing the machine execution policy.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0p2p.ps1"
if errorlevel 1 pause
