@echo off
setlocal enabledelayedexpansion
title EventCraft AI - Launcher

echo ========================================================
echo               EventCraft AI Application
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

echo [1/3] Checking Prisma Client...
if not exist "node_modules\.prisma\client\query_engine-windows.dll.node" (
    echo [INFO] Generating Prisma Client for the first time...
    call npm.cmd run prisma:generate
) else (
    echo [INFO] Prisma Client is already generated and ready.
)

echo.
echo [2/3] Checking environment configuration and database connectivity...
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] .env not found. Copying .env.example to .env...
        copy ".env.example" ".env" >nul
    )
)

REM Check if PostgreSQL port 5432 is reachable (instant TCP socket check)
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { (New-Object Net.Sockets.TcpClient).Connect('127.0.0.1', 5432); exit 0 } catch { exit 1 }" >nul 2>&1
if !errorlevel! neq 0 (
    echo [WARN] PostgreSQL is not currently reachable on localhost:5432.
    echo        If using Docker: run 'docker compose up -d'
    echo        If using Windows service: run 'Start-Service postgresql*'
    echo        The app will run in offline mode [fallbacks active; registration requires DB].
) else (
    echo [INFO] PostgreSQL database server is reachable on localhost:5432.
)

echo.
echo [3/3] Starting EventCraft AI Development Server...
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

