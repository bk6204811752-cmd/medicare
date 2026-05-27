#!/usr/bin/env pwsh
# Medicare — Cleanup & Deploy Script
# Run this from the project root: pwsh scripts\deploy-clean.ps1

$root = Split-Path -Parent $PSScriptRoot

Write-Host "`n=== STEP 1: Deleting useless files ===" -ForegroundColor Cyan

$filesToDelete = @(
    "scripts\add-clean-envs.js",
    "scripts\test-request.js",
    "scripts\test-smtp-local.js",
    "scripts\download-ocr.js",
    "scripts\copy-ocr.js",
    "scripts\seed-supabase.ts",
    "scripts\verify-supabase.ts",
    "errors.txt",
    "lint-errors.txt",
    "tsc-errors.txt",
    "tsc-output.txt",
    "implementplan.md",
    "prisma.config.js",
    "tsconfig.tsbuildinfo",
    "data\dev-3002.err.log",
    "data\dev-3002.out.log",
    "data\dev-3003.err.log",
    "data\dev-3003.out.log",
    "data\dev-3004.err.log",
    "data\dev-3004.out.log",
    "data\next-dev.err.log",
    "data\next-dev.out.log",
    "data\medcare.db",
    "data\medcare.db-shm",
    "data\medcare.db-wal"
)

foreach ($f in $filesToDelete) {
    $fullPath = Join-Path $root $f
    if (Test-Path $fullPath) {
        Remove-Item $fullPath -Force
        Write-Host "  Deleted: $f" -ForegroundColor Green
    } else {
        Write-Host "  Skip (not found): $f" -ForegroundColor Gray
    }
}

Write-Host "`n=== STEP 2: Removing files from git tracking ===" -ForegroundColor Cyan
Set-Location $root

# Remove tracked files that should now be gitignored
git rm --cached tsconfig.tsbuildinfo 2>$null
git rm --cached implementplan.md 2>$null
git rm --cached prisma.config.js 2>$null
git rm --cached errors.txt 2>$null
git rm --cached lint-errors.txt 2>$null
git rm --cached tsc-errors.txt 2>$null
git rm --cached tsc-output.txt 2>$null
git rm --cached .env 2>$null
git rm --cached "data/medcare.db" 2>$null
git rm --cached "data/medcare.db-shm" 2>$null
git rm --cached "data/medcare.db-wal" 2>$null
git rm --cached -r "data/mail-outbox" 2>$null
Write-Host "  Git untracking done." -ForegroundColor Green

Write-Host "`n=== STEP 3: Git status ===" -ForegroundColor Cyan
git status --short

Write-Host "`n=== STEP 4: Staging all changes ===" -ForegroundColor Cyan
git add -A
git status --short

Write-Host "`n=== STEP 5: Committing ===" -ForegroundColor Cyan
git commit -m "fix: add prisma DB url, remove prisma db push from build, clean 25 useless files

- prisma/schema.prisma: add url = env(DATABASE_URL) and directUrl = env(DIRECT_URL)
- scripts/build.js: remove destructive 'prisma db push' from build step
- .gitignore: properly exclude .env, tsbuildinfo, data logs, dev scripts
- .vercelignore: exclude data/ dir, dev scripts, large CSV
- Deleted 25 dev-only files: one-off scripts, error logs, SQLite DBs"

Write-Host "`n=== STEP 6: Pushing to origin/main ===" -ForegroundColor Cyan
git push origin main

Write-Host "`n=== DONE! Vercel will auto-deploy. ===" -ForegroundColor Green
Write-Host "Check deployment at: https://vercel.com/dashboard" -ForegroundColor Yellow
