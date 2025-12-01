#!/usr/bin/env pwsh
Write-Host "Applying Supabase migrations (requires supabase CLI and authenticated session)"

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Error "supabase CLI not found in PATH. Install from https://supabase.com/docs/guides/cli"
  exit 1
}

try {
  # Use the migrations in the supabase/migrations folder
  Write-Host "Running: supabase db push --file supabase/migrations (may require project config)"
  supabase db push
  Write-Host "Migrations applied. If you prefer to apply individual SQL files, use psql with the DATABASE_URL."
} catch {
  Write-Error "Failed to apply migrations: $_"
  exit 1
}
