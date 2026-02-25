@echo off
echo 🚀 Demarrage du CPU Monitor...
echo.
cd /d "%~dp0"
call npm install --silent
echo ✅ Serveur lance ! Ouvre http://localhost:3000
echo    (Ferme cette fenetre pour arreter)
echo.
start http://localhost:3000
node server.js
pause
