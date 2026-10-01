@echo off
cd /d "%~dp0"
where py >nul 2>&1
if %errorlevel%==0 (
  start "Dolar Web" http://localhost:8000
  py -m http.server 8000
  exit /b
)
where python >nul 2>&1
if %errorlevel%==0 (
  start "Dolar Web" http://localhost:8000
  python -m http.server 8000
  exit /b
)
echo No se encontro Python.
echo Instala Python y vuelve a ejecutar este archivo.
pause
