@echo off
title Medicare - Deploy Clean Script
color 0A
echo.
echo  ================================================
echo   Medicare Pharmacy SaaS - Deploy Clean Script
echo  ================================================
echo.

cd /d "C:\Users\basan\OneDrive\Desktop\Medicare"
if errorlevel 1 (
    echo ERROR: Could not change to project directory!
    pause
    exit /b 1
)

echo [1/7] Deleting useless files...
echo.

if exist "scripts\add-clean-envs.js"   del /f /q "scripts\add-clean-envs.js"   & echo    Deleted: scripts\add-clean-envs.js
if exist "scripts\test-request.js"     del /f /q "scripts\test-request.js"     & echo    Deleted: scripts\test-request.js
if exist "scripts\test-smtp-local.js"  del /f /q "scripts\test-smtp-local.js"  & echo    Deleted: scripts\test-smtp-local.js
if exist "scripts\download-ocr.js"     del /f /q "scripts\download-ocr.js"     & echo    Deleted: scripts\download-ocr.js
if exist "scripts\copy-ocr.js"         del /f /q "scripts\copy-ocr.js"         & echo    Deleted: scripts\copy-ocr.js
if exist "scripts\seed-supabase.ts"    del /f /q "scripts\seed-supabase.ts"    & echo    Deleted: scripts\seed-supabase.ts
if exist "scripts\verify-supabase.ts"  del /f /q "scripts\verify-supabase.ts"  & echo    Deleted: scripts\verify-supabase.ts

if exist "errors.txt"          del /f /q "errors.txt"          & echo    Deleted: errors.txt
if exist "lint-errors.txt"     del /f /q "lint-errors.txt"     & echo    Deleted: lint-errors.txt
if exist "tsc-errors.txt"      del /f /q "tsc-errors.txt"      & echo    Deleted: tsc-errors.txt
if exist "tsc-output.txt"      del /f /q "tsc-output.txt"      & echo    Deleted: tsc-output.txt
if exist "implementplan.md"    del /f /q "implementplan.md"     & echo    Deleted: implementplan.md
if exist "prisma.config.js"    del /f /q "prisma.config.js"    & echo    Deleted: prisma.config.js
if exist "tsconfig.tsbuildinfo" del /f /q "tsconfig.tsbuildinfo" & echo   Deleted: tsconfig.tsbuildinfo

if exist "data\dev-3002.err.log" del /f /q "data\dev-3002.err.log" & echo    Deleted: data\dev-3002.err.log
if exist "data\dev-3002.out.log" del /f /q "data\dev-3002.out.log"
if exist "data\dev-3003.err.log" del /f /q "data\dev-3003.err.log"
if exist "data\dev-3003.out.log" del /f /q "data\dev-3003.out.log"
if exist "data\dev-3004.err.log" del /f /q "data\dev-3004.err.log"
if exist "data\dev-3004.out.log" del /f /q "data\dev-3004.out.log"
if exist "data\next-dev.err.log" del /f /q "data\next-dev.err.log"
if exist "data\next-dev.out.log" del /f /q "data\next-dev.out.log"
if exist "data\medcare.db"       del /f /q "data\medcare.db"     & echo    Deleted: data\medcare.db
if exist "data\medcare.db-shm"   del /f /q "data\medcare.db-shm"
if exist "data\medcare.db-wal"   del /f /q "data\medcare.db-wal"

echo.
echo    Files deleted successfully.

echo.
echo [2/7] Removing sensitive and stale files from git tracking...
git rm --cached .env                   2>nul
git rm --cached tsconfig.tsbuildinfo  2>nul
git rm --cached implementplan.md       2>nul
git rm --cached prisma.config.js       2>nul
git rm --cached errors.txt             2>nul
git rm --cached lint-errors.txt        2>nul
git rm --cached tsc-errors.txt         2>nul
git rm --cached tsc-output.txt         2>nul
git rm --cached "data/medcare.db"      2>nul
git rm --cached "data/medcare.db-shm"  2>nul
git rm --cached "data/medcare.db-wal"  2>nul
git rm --cached -r "data/mail-outbox"  2>nul
echo    Git untracking complete.

echo.
echo [3/7] Verifying git user config...
git config user.email "bk6204811752@gmail.com" 2>nul
git config user.name "bk6204811752-cmd" 2>nul
echo    Git user: bk6204811752@gmail.com

echo.
echo [4/7] Current git status...
git status --short

echo.
echo [5/7] Staging all changes...
git add -A
echo    All changes staged.

echo.
echo [6/7] Committing all fixes...
git commit -m "fix: Prisma DB URL + safe build + 25 useless files removed"
if errorlevel 1 (
    echo.
    echo    Note: Nothing new to commit, or already committed.
) else (
    echo    Commit successful!
)

echo.
echo [7/7] Pushing to origin/main (triggers Vercel auto-deploy)...
git push origin main
if errorlevel 1 (
    echo.
    echo ================================================
    echo  PUSH FAILED - Possible reasons:
    echo  1. No internet connection
    echo  2. Not authenticated with GitHub
    echo     Run: git credential-manager-core configure
    echo  3. Wrong remote URL
    echo     Run: git remote -v
    echo ================================================
    pause
    exit /b 1
)

echo.
echo  ================================================
echo   DEPLOY SUCCESS!
echo.
echo   Vercel is now building and deploying...
echo.
echo   Check status at:
echo   https://vercel.com/dashboard
echo.
echo   Test your app logins:
echo   Super Admin : admin@medcare.local / Admin@12345
echo   Shop Owner  : owner@sharmamedical.local / Shop@12345
echo   Stockist    : stockist@medcare.local / Stockist@12345
echo  ================================================
echo.
pause
