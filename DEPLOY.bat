@echo off
title Medicare - Fix Prisma 7 + Redeploy
color 0A
echo.
echo  ================================================
echo   Medicare - Prisma 7 Fix + Redeploy
echo  ================================================
echo.

cd /d "C:\Users\basan\OneDrive\Desktop\Medicare"
if errorlevel 1 (
    echo ERROR: Could not change to project directory!
    pause
    exit /b 1
)

echo [1/4] Deleting any remaining junk files...
if exist "errors.txt"           del /f /q "errors.txt"
if exist "lint-errors.txt"      del /f /q "lint-errors.txt"
if exist "tsc-errors.txt"       del /f /q "tsc-errors.txt"
if exist "tsc-output.txt"       del /f /q "tsc-output.txt"
if exist "implementplan.md"     del /f /q "implementplan.md"
if exist "tsconfig.tsbuildinfo" del /f /q "tsconfig.tsbuildinfo"
if exist "scripts\add-clean-envs.js"   del /f /q "scripts\add-clean-envs.js"
if exist "scripts\test-request.js"     del /f /q "scripts\test-request.js"
if exist "scripts\test-smtp-local.js"  del /f /q "scripts\test-smtp-local.js"
if exist "scripts\download-ocr.js"     del /f /q "scripts\download-ocr.js"
if exist "scripts\copy-ocr.js"         del /f /q "scripts\copy-ocr.js"
if exist "scripts\seed-supabase.ts"    del /f /q "scripts\seed-supabase.ts"
if exist "scripts\verify-supabase.ts"  del /f /q "scripts\verify-supabase.ts"
if exist "data\medcare.db"      del /f /q "data\medcare.db"
if exist "data\medcare.db-shm"  del /f /q "data\medcare.db-shm"
if exist "data\medcare.db-wal"  del /f /q "data\medcare.db-wal"
echo    Done.

echo.
echo [2/4] Staging all changes (Prisma 7 fix + config)...
git rm --cached .env 2>nul
git rm --cached implementplan.md 2>nul
git rm --cached errors.txt 2>nul
git rm --cached lint-errors.txt 2>nul
git rm --cached tsc-errors.txt 2>nul
git rm --cached tsc-output.txt 2>nul
git rm --cached tsconfig.tsbuildinfo 2>nul
git add -A
echo    Staged. Current changes:
git status --short

echo.
echo [3/4] Committing fix...
git commit -m "fix: Prisma 7 - remove url/directUrl from schema, add prisma.config.ts"
if errorlevel 1 (
    echo    Nothing to commit - already up to date.
) else (
    echo    Committed!
)

echo.
echo [4/4] Pushing to GitHub (triggers Vercel redeploy)...
git push origin main
if errorlevel 1 (
    echo.
    echo ERROR: Push failed! Try: git push origin main
    pause
    exit /b 1
)

echo.
echo  ================================================
echo   PUSHED! Vercel is rebuilding now.
echo.
echo   Watch build at: https://vercel.com/dashboard
echo.
echo   --- Test logins after deploy ---
echo   Super Admin : admin@medcare.local / Admin@12345
echo   Shop Owner  : owner@sharmamedical.local / Shop@12345
echo   Stockist    : stockist@medcare.local / Stockist@12345
echo  ================================================
echo.
pause
