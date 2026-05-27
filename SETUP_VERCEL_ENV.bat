@echo off
title Medicare - Setup Vercel Environment Variables
color 0B
echo.
echo  ================================================
echo   Medicare - Set Vercel Environment Variables
echo  ================================================
echo.
echo  Project: medicare (prj_UmCXnQArEE3XL4cFSKA9pKjv4tlu)
echo  Org: team_0iWIqVgmak5peca2cQQjcJOT
echo.

cd /d "C:\Users\basan\OneDrive\Desktop\Medicare"

echo  Checking Vercel CLI...
where vercel >nul 2>&1
if errorlevel 1 (
    echo  Installing Vercel CLI globally...
    npm install -g vercel
)

echo.
echo  NOTE: If prompted to log in, use your Vercel account.
echo  Press any key to start uploading env vars...
pause >nul

echo.
echo  Uploading DATABASE variables...
echo postgresql://postgres.dgrusdvpreyetvajkmzr:Basant%%406204811752@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true | vercel env add DATABASE_URL production --force 2>nul || echo postgresql://postgres.dgrusdvpreyetvajkmzr:Basant%%406204811752@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true | npx vercel env add DATABASE_URL production
echo postgresql://postgres.dgrusdvpreyetvajkmzr:Basant%%406204811752@aws-1-ap-south-1.pooler.supabase.com:5432/postgres | vercel env add DIRECT_URL production --force 2>nul || echo postgresql://postgres.dgrusdvpreyetvajkmzr:Basant%%406204811752@aws-1-ap-south-1.pooler.supabase.com:5432/postgres | npx vercel env add DIRECT_URL production
echo    DATABASE_URL and DIRECT_URL set.

echo.
echo  Uploading SUPABASE variables...
echo https://dgrusdvpreyetvajkmzr.supabase.co | vercel env add NEXT_PUBLIC_SUPABASE_URL production --force 2>nul
echo sb_publishable_8UIk1H4F2DBDUjGjdawaZw_AA2r2xi4 | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --force 2>nul
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRncnVzZHZwcmV5ZXR2YWprbXpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg3Mjc3MCwiZXhwIjoyMDk1NDQ4NzcwfQ.uQDGhTuheyUIcRaNeSL7s2vfFHxYfSR6Exr_vBSm53I | vercel env add SUPABASE_SERVICE_ROLE_KEY production --force 2>nul
echo    SUPABASE variables set.

echo.
echo  Uploading EMAIL/SMTP variables...
echo hojai4828@gmail.com | vercel env add ADMIN_EMAIL production --force 2>nul
echo smtp.gmail.com | vercel env add SMTP_HOST production --force 2>nul
echo 587 | vercel env add SMTP_PORT production --force 2>nul
echo false | vercel env add SMTP_SECURE production --force 2>nul
echo hojai4828@gmail.com | vercel env add SMTP_USER production --force 2>nul
echo qvdv gnuf eppn hbzj | vercel env add SMTP_PASS production --force 2>nul
echo Medicare ^<hojai4828@gmail.com^> | vercel env add SMTP_FROM production --force 2>nul
echo    SMTP variables set.

echo.
echo  Uploading APP SECRET variables...
echo MedCare-2026-Secure-Daily-Report | vercel env add DAILY_REPORT_SECRET production --force 2>nul
echo    DAILY_REPORT_SECRET set.

echo.
echo  Uploading CLOUDINARY variables...
echo dqkvfjfhn | vercel env add CLOUDINARY_CLOUD_NAME production --force 2>nul
echo 595986836534584 | vercel env add CLOUDINARY_API_KEY production --force 2>nul
echo iEpYf7MjHx39ijisZQxjGQ_onhM | vercel env add CLOUDINARY_API_SECRET production --force 2>nul
echo    CLOUDINARY variables set.

echo.
echo  ================================================
echo   All environment variables uploaded!
echo.
echo   Now trigger a redeploy:
echo   vercel --prod
echo   OR push any change to main branch.
echo  ================================================
echo.
pause
