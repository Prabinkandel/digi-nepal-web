@echo off
echo.
echo ========================================
echo   ToolsVault Server Setup
echo ========================================
echo.
cd /d %~dp0server
echo Installing dependencies...
npm install
echo.
echo ========================================
echo   Starting server...
echo ========================================
echo.
echo  Store:   http://localhost:3001
echo  Admin:   http://localhost:3001/admin
echo  API:     http://localhost:3001/api
echo.
echo  Admin login: admin@toolsvault.com
echo  Password:    admin123
echo.
node server.js
