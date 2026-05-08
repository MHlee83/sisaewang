# Railway Supabase Production Environment Variables Setup
# Run this script in PowerShell from the project root: .\set_railway_vars.ps1

Write-Host "Setting Railway environment variables for sisaewang service..." -ForegroundColor Cyan

# Project and service IDs
$PROJECT_ID = "1dd03cad-9cb4-446e-8a9c-3d438c674023"
$SERVICE_ID = "66e8b014-ba64-4987-8526-b1e529265efa"
$ENV_ID = "9388ad58-370a-4e96-950d-822fa4a8c0f9"

# Supabase variables to add
$vars = @(
    @{ Name = "SUPABASE_URL"; Value = "https://jjhdzuxzxxsietcnolro.supabase.co" },
    @{ Name = "SUPABASE_ANON_KEY"; Value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqaGR6dXh6eHhzaWV0Y25vbHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjM5OTQsImV4cCI6MjA5Mzc5OTk5NH0.iJSpldUxMZP5uUyzbr-ujfq7Zn-KwHEAFEdJ9g22EEM" },
    @{ Name = "SUPABASE_SERVICE_ROLE_KEY"; Value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqaGR6dXh6eHhzaWV0Y25vbHJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIyMzk5NCwiZXhwIjoyMDkzNzk5OTk0fQ.nxqbTvTKafoO4hEHcLhyDwQhZiPtzqwTMapMNh6o2gA" }
)

foreach ($var in $vars) {
    Write-Host "Adding $($var.Name)..." -ForegroundColor Yellow
    railway variables set "$($var.Name)=$($var.Value)" --service $SERVICE_ID --environment production 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] $($var.Name) added" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $($var.Name) failed" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done! Verify at:" -ForegroundColor Cyan
Write-Host "https://railway.com/project/$PROJECT_ID/service/$SERVICE_ID/variables?environmentId=$ENV_ID"
