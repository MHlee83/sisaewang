@echo off
chcp 65001 > nul
echo ===================================
echo  시세왕 EAS Build 준비 스크립트
echo ===================================

cd /d C:\sisaewang\apps\mobile

:: Git lock 파일 제거 (있을 경우)
if exist "..\.git\index.lock" (
    del "..\.git\index.lock"
    echo [OK] Git lock 파일 제거
)

:: 변경된 파일 커밋
git add eas.json .gitignore
git commit -m "fix: EAS Build APK 설정 및 appVersionSource 로컬 전환"

echo.
echo === 빌드 시작 (APK) ===
echo 예상 소요 시간: 10~15분
echo.

eas build -p android --profile preview

echo.
echo === 완료 ===
echo Expo 대시보드에서 APK 다운로드 링크 확인:
echo https://expo.dev/accounts/leemh/projects/sisaewang/builds
echo.
pause
