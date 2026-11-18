@echo off
echo Stopping GymVIP background services...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq gymvip*" >nul 2>&1
echo GymVIP stopped successfully.
pause
