@echo off
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul
if errorlevel 1 (
    start "Karaoke Studio Backend" /min "%PROJECT_ROOT%backend\.venv\Scripts\python.exe" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
)

netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul
if errorlevel 1 (
    start "Karaoke Studio Frontend" /min cmd /c "npm --prefix ""%PROJECT_ROOT%frontend"" run dev"
)

ping 127.0.0.1 -n 3 >nul
start "" "http://localhost:5173"
exit /b 0