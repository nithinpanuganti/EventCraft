@echo off
setlocal enabledelayedexpansion
title EventCraft AI - Launcher

echo ========================================================
echo               EventCraft AI Application
echo ========================================================
echo.

:: Move to the directory where this script is located
cd /d "%~dp0"

echo [1/3] Checking Prisma Client...
if not exist "node_modules\.prisma\client\query_engine-windows.dll.node" (
    echo [INFO] Generating Prisma Client for the first time...
    call npm.cmd run prisma:generate
) else (
    echo [INFO] Prisma Client is already generated and ready.
)

echo.
echo [2/3] Checking environment configuration and database connectivity...
if not exist .env (
    if exist .env.example (
        echo [INFO] .env not found. Copying .env.example to .env...
        copy .env.example .env >nul
    )
)

:: Check if PostgreSQL port 5432 is reachable
powershell -NoProfile -Command "$t = Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet; if (-not $t) { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] PostgreSQL is not currently reachable on localhost:5432.
    echo        If using Docker: run 'docker compose up -d'
    echo        If using Windows service: run 'Start-Service postgresql*'
    echo        The app will run in offline mode (fallbacks active; registration requires DB).
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
