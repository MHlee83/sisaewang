# Sync C:\dev\sisaewang\src -> C:\ssa\src
# Metro root: C:\ssa

$src = Join-Path $PSScriptRoot "src"
$dst = "C:\ssa\src"

Write-Host "SRC: $src"
Write-Host "DST: $dst"
Write-Host ""

$files = @(
  "screens\onboarding\IntroScreen.tsx",
  "screens\onboarding\AuthScreen.tsx",
  "screens\home\HomeScreen.tsx",
  "screens\explore\ItemDetailScreen.tsx",
  "screens\mypage\MyPageScreen.tsx",
  "screens\mypage\AlertCreateScreen.tsx",
  "screens\tools\ProfitCalculatorScreen.tsx",
  "screens\tools\BasketCalculatorScreen.tsx",
  "screens\analysis\AnalysisScreen.tsx",
  "screens\community\CommunityScreen.tsx",
  "screens\community\PostDetailScreen.tsx",
  "screens\community\PostCreateScreen.tsx",
  "navigation\RootNavigator.tsx",
  "services\mockData.ts",
  "services\communityService.ts",
  "services\apiService.ts",
  "services\api.ts",
  "store\authStore.ts",
  "store\calculatorStore.ts",
  "store\filterStore.ts",
  "components\common\FavoriteButton.tsx",
  "components\common\PremiumPaywallModal.tsx",
  "components\chart\CandlestickChart.tsx",
  "constants\index.ts",
  "utils\firebase.ts"
)

$updated = 0
$missed  = 0

foreach ($f in $files) {
  $srcPath = Join-Path $src $f
  $dstPath = Join-Path $dst $f
  $dstDir  = Split-Path $dstPath

  if (-not (Test-Path $dstDir)) {
    New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
  }

  if (Test-Path $srcPath) {
    Copy-Item -Force $srcPath $dstPath
    Write-Host "OK   $f"
    $updated++
  } else {
    Write-Host "MISS $f"
    $missed++
  }
}

# Root files
$rootFiles = @("App.tsx", "app.json")
foreach ($f in $rootFiles) {
  $srcPath = Join-Path $PSScriptRoot $f
  $dstPath = "C:\ssa\$f"
  if (Test-Path $srcPath) {
    Copy-Item -Force $srcPath $dstPath
    Write-Host "OK   $f (root)"
    $updated++
  }
}

Write-Host ""
Write-Host "Done: $updated synced, $missed missed"
Write-Host "Shake phone -> Reload to apply changes"
