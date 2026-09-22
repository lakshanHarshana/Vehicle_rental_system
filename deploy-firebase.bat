@echo off
echo =======================================================
echo 🚀 Deploying Vehicle Rental Management System to Firebase
echo =======================================================
echo.

echo 1. Checking Firebase CLI...
call firebase --version
if %errorlevel% neq 0 (
    echo ❌ Firebase CLI not found. Installing firebase-tools...
    call npm install -g firebase-tools
)

echo.
echo 2. Starting Firebase Deployment...
call firebase deploy

echo.
echo =======================================================
echo ✅ Deployment Process Completed!
echo =======================================================
pause
