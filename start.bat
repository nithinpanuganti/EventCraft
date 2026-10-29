@echo off
setlocal enabledelayedexpansion
title EventCraft AI - Local Launcher

echo ========================================================
echo        EventCraft AI — Local-First Event Planner
echo ========================================================
echo.

REM Move to the directory where this script is located
cd /d "%~dp0"

REM Verify Node.js and npm are available
where npm >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Node.js / npm is not found in your PATH.
    echo         Please install Node.js from https://nodejs.org and try again.
    pause
    exit /b 1
)

REM Check dependencies
if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm.cmd install
    if !errorlevel! neq 0 (
        echo [ERROR] npm install encountered an error.
        pause
        exit /b 1
    )
)

REM Ensure local environment file exists
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Creating .env from .env.example...
        copy ".env.example" ".env" >nul
    )
)

echo [INFO] Storage: Browser-native IndexedDB (eventcraft_local_db)
echo [INFO] Mode:    100%% Local-First (Zero external network dependencies or database required)
echo.
echo ========================================================
echo  Application will be accessible at:
echo  - Local:   http://localhost:3000
echo ========================================================
echo.
echo Press Ctrl+C in this terminal window to stop the server.
echo.

call npm.cmd run dev

pause
