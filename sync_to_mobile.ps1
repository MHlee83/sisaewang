# 스크립트가 있는 폴더(시세왕) 기준 상대 경로 사용 → 한글 경로 문제 우회
$src = Join-Path $PSScriptRoot "apps\mobile"
$dst = "C:\sisaewang-mobile"

Write-Host "SRC: $src"
Write-Host "DST: $dst"

# ── 개별 파일 목록 ──────────────────────────────────────────
$files = @(
  "App.tsx",
  "app.json",
  "src\screens\onboarding\IntroScreen.tsx",
  "src\store\filterStore.ts",
  "src\components\common\FavoriteButton.tsx",
  "src\components\common\PremiumPaywallModal.tsx",
  "src\components\chart\CandlestickChart.tsx",
  "src\screens\home\HomeScreen.tsx",
  "src\screens\explore\ItemDetailScreen.tsx",
  "src\screens\mypage\MyPageScreen.tsx",
  "src\screens\mypage\AlertCreateScreen.tsx",
  "src\screens\tools\ProfitCalculatorScreen.tsx",
  "src\screens\tools\BasketCalculatorScreen.tsx",
  "src\store\calculatorStore.ts",
  "src\navigation\RootNavigator.tsx",
  "src\services\mockData.ts",
  "src\constants\index.ts"
)

foreach ($f in $files) {
  $srcPath = Join-Path $src $f
  $dstPath = Join-Path $dst $f
  $dstDir  = Split-Path $dstPath

  if (-not (Test-Path $dstDir)) {
    New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
  }

  if (Test-Path $srcPath) {
    Copy-Item -Force $srcPath $dstPath
    Write-Host "OK  $f"
  } else {
    Write-Host "MISS $f"
  }
}

# ── assets 폴더 전체 복사 ────────────────────────────────────
$assetsSrc = Join-Path $src "assets"
$assetsDst = Join-Path $dst "assets"

if (Test-Path $assetsSrc) {
  if (-not (Test-Path $assetsDst)) {
    New-Item -ItemType Directory -Force -Path $assetsDst | Out-Null
  }
  Copy-Item -Force -Recurse "$assetsSrc\*" $assetsDst
  Write-Host "OK  assets\ (icon, splash, favicon)"
} else {
  Write-Host "MISS assets\"
}

Write-Host ""
Write-Host "Done: $($files.Count) files + assets folder synced"
