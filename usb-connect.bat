@echo off
chcp 65001 > nul
title 시세왕 개발 서버

echo ================================================
echo   시세왕 개발 환경 시작
echo ================================================
echo.

:: ADB 위치 자동 탐색
set ADB_FOUND=0

if exist "C:\platform-tools\platform-tools\adb.exe" (
    set PATH=%PATH%;C:\platform-tools\platform-tools
    set ADB_FOUND=1
    echo  [ADB] C:\platform-tools\platform-tools\adb.exe 발견
)

if exist "C:\platform-tools\adb.exe" (
    set PATH=%PATH%;C:\platform-tools
    set ADB_FOUND=1
    echo  [ADB] C:\platform-tools\adb.exe 발견
)

if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set PATH=%PATH%;%LOCALAPPDATA%\Android\Sdk\platform-tools
    set ADB_FOUND=1
    echo  [ADB] Android SDK platform-tools 발견
)

if "%ADB_FOUND%"=="0" (
    echo.
    echo  !! adb.exe를 찾을 수 없습니다.
    echo  아래 경로 중 adb.exe가 있는 폴더를 확인하세요:
    echo    - C:\platform-tools\
    echo    - C:\platform-tools\platform-tools\
    echo.
    pause
    exit
)

:: ADB 서버 재시작
echo [1/3] 기기 연결 확인 중...
adb kill-server > nul 2>&1
adb start-server > nul 2>&1
timeout /t 1 > nul

adb devices | findstr /R "device$" > nul
if errorlevel 1 (
    echo.
    echo  !! 기기가 연결되지 않았습니다.
    echo  USB를 연결하고 폰에서 "USB 디버깅 허용"을 누른 후
    echo  아무 키나 누르세요...
    pause > nul
    adb devices | findstr /R "device$" > nul
    if errorlevel 1 (
        echo  여전히 기기가 인식되지 않습니다. USB 및 디버깅 설정을 확인하세요.
        pause
        exit
    )
)

:: USB 포트 포워딩
echo [2/3] USB 포트 연결 중...
adb reverse tcp:8081 tcp:8081
if errorlevel 1 (
    echo  !! 포트 포워딩 실패. USB 디버깅이 허용되어 있는지 확인하세요.
    pause
    exit
)
echo  OK - 포트 연결 완료

:: Metro 시작
echo [3/3] Metro 번들러 시작 중...
echo.
echo  Expo Go 앱을 열면 자동으로 연결됩니다.
echo  종료하려면 Ctrl+C 를 누르세요.
echo ================================================
echo.

cd /d C:\sisaewang\apps\mobile
npx expo start --localhost

pause
