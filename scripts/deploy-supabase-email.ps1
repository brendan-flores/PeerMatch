# Deploy PeerMatch verification email to Supabase (one-time setup + updates)
# Run from repo root in PowerShell:
#   .\scripts\deploy-supabase-email.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host ""
Write-Host "=== PeerMatch: Supabase email deploy ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "What this does:" -ForegroundColor Yellow
Write-Host "  1. Logs you into Supabase (browser opens once)"
Write-Host "  2. Links this folder to project krbwawqvwsdgjtajoivv"
Write-Host "  3. Stores your Resend API key INSIDE Supabase (not on Render)"
Write-Host "  4. Uploads the send-verification-email function"
Write-Host ""

$continue = Read-Host "Continue? (y/n)"
if ($continue -ne "y" -and $continue -ne "Y") { exit 0 }

Write-Host "`nStep 1/4: Login (browser will open)..." -ForegroundColor Green
npx supabase login

Write-Host "`nStep 2/4: Link project..." -ForegroundColor Green
npx supabase link --project-ref krbwawqvwsdgjtajoivv

Write-Host "`nStep 3/4: Resend secrets (paste when prompted)..." -ForegroundColor Green
$resendKey = Read-Host "Paste your Resend API key (starts with re_)"
if (-not $resendKey.StartsWith("re_")) {
  Write-Host "Warning: key does not start with re_ — double-check you copied the full key." -ForegroundColor Yellow
}
npx supabase secrets set "RESEND_API_KEY=$resendKey"
npx supabase secrets set 'FROM_EMAIL=PeerMatch <onboarding@resend.dev>'
npx supabase secrets set "VERIFICATION_CODE_TTL_MINUTES=10"

Write-Host "`nStep 4/4: Deploy function..." -ForegroundColor Green
npx supabase functions deploy send-verification-email

Write-Host ""
Write-Host "Done. Next:" -ForegroundColor Cyan
Write-Host "  - Render env: SUPABASE_URL=https://krbwawqvwsdgjtajoivv.supabase.co"
Write-Host "  - Render env: SUPABASE_SERVICE_ROLE_KEY=<your service role secret>"
Write-Host "  - Redeploy Render, then open /api/health"
Write-Host ""
