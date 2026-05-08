# 시세왕 모바일 앱을 C:\sisaewang-mobile 로 이동하는 스크립트
# 실행: PowerShell에서 우클릭 → "PowerShell로 실행"

$source = "$env:USERPROFILE\Pictures\Desktop\agent\claude\시세왕\apps\mobile"
$dest = "C:\sisaewang-mobile"

Write-Host "=== 시세왕 EAS 빌드 경로 문제 해결 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "소스: $source"
Write-Host "대상: $dest"
Write-Host ""

# 1. 대상 폴더 생성
if (Test-Path $dest) {
    Write-Host "[!] $dest 이미 존재합니다. 덮어쓸까요? (Y/N)" -ForegroundColor Yellow
    $confirm = Read-Host
    if ($confirm -ne 'Y' -and $confirm -ne 'y') {
        Write-Host "취소됨." -ForegroundColor Red
        exit
    }
    Remove-Item -Recurse -Force $dest
}

Write-Host "[1/5] 폴더 복사 중..." -ForegroundColor Green
Copy-Item -Recurse -Force $source $dest

# 2. 기존 .git 제거 (apps/mobile 내부 git)
$oldGit = "$dest\.git"
if (Test-Path $oldGit) {
    Write-Host "[2/5] 기존 .git 제거 중..." -ForegroundColor Green
    Remove-Item -Recurse -Force $oldGit
}

# 3. 새 git 초기화
Write-Host "[3/5] 새 git 저장소 초기화..." -ForegroundColor Green
Set-Location $dest
git init
git add .
git commit -m "init: sisaewang mobile app (moved from 시세왕/apps/mobile)"

# 4. node_modules 있으면 안내
if (Test-Path "$dest\node_modules") {
    Write-Host "[!] node_modules가 복사되었습니다. 용량이 크면 삭제 후 재설치하세요:" -ForegroundColor Yellow
    Write-Host "    Remove-Item -Recurse -Force C:\sisaewang-mobile\node_modules"
    Write-Host "    cd C:\sisaewang-mobile && npm install"
}

Write-Host ""
Write-Host "[4/5] 완료! 이제 아래 명령어로 EAS 빌드를 실행하세요:" -ForegroundColor Green
Write-Host ""
Write-Host "  cd C:\sisaewang-mobile" -ForegroundColor Yellow
Write-Host "  npx eas build --platform android --profile preview" -ForegroundColor Yellow
Write-Host ""
Write-Host "[5/5] 만약 EAS 프로젝트 재연결이 필요하면:" -ForegroundColor Green
Write-Host "  npx eas init  (기존 프로젝트 ID: 9bb9b5aa-7052-4b61-82f9-14527c0125b0)" -ForegroundColor Yellow
Write-Host ""
Write-Host "=== 완료 ===" -ForegroundColor Cyan
