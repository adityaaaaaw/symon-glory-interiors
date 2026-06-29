@echo off
echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║     Glory Simon Interiors - Site Visit Booking       ║
echo  ║              Development Server Launcher             ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Starting Backend ^(Port 5000^) and Frontend ^(Port 5173^)...
echo.

:: Start backend in new window
start "Glory Simon - Backend API" cmd /k "cd /d %~dp0backend && npm run dev"

:: Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak > nul

:: Start frontend in new window
start "Glory Simon - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo  ✅ Both servers launching in separate windows.
echo.
echo  🌐 Frontend : http://localhost:5173
echo  🔌 API      : http://localhost:5000/api/health
echo.
echo  Login Credentials:
echo  ------------------
echo  Admin    : admin@glorysimon.com     / Admin@Glory123
echo  Designer : priya.design@glorysimon.com / Glory@123
echo  Engineer : raj.engineer@glorysimon.com / Glory@123
echo  Client   : client01@gmail.com       / Client@123
echo.
pause
