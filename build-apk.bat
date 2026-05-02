@echo off
chcp 65001 > nul
echo ===================================
echo  시세왕 APK 빌드 (TypeScript 수정 후)
echo ===================================

cd /d C:\sisaewang

:: Git lock 제거 (혹시 남아 있으면)
if exist ".git\index.lock" del ".git\index.lock"

:: 수정된 파일 커밋
git add apps/mobile/src/screens/mypage/MyPageScreen.tsx
git add apps/mobile/src/screens/community/PostDetailScreen.tsx
git commit -m "fix: TypeScript 에러 2개 수정 - item.id String 변환, PostDetailScreen initialData 타입 명시"

echo.
echo [OK] 커밋 완료. EAS 빌드 시작...
echo 예상 소요 시간: 10~15분
echo.

cd apps\mobile
eas build -p android --profile preview

echo.
echo === 완료 ===
echo APK 다운로드:
echo https://expo.dev/accounts/leemh/projects/sisaewang/builds
echo.
pause
