@echo off
echo.
echo ========================================
echo   Digi Nepal Server
echo ========================================
echo.
cd /d %~dp0
echo  Store:   http://localhost:3001
echo  Admin:   http://localhost:3001/admin
echo  API:     http://localhost:3001/api
echo.
echo  Default Admin: admin@diginepal.com
echo  Password:      admin123
echo.
npm start
