@echo off
cd "D:\AI_Agency\projects\SAN BERNARDO DEPAS - CASA -\minideptos-lo-blanco"
echo ========================================
echo   🚀 EMPRENDE360 - SERVIDOR LOCAL
echo ========================================
echo.
echo   🏠 Panel:       http://localhost:3000/
echo   📊 Dashboard:   http://localhost:3000/panel
echo   📋 Proyectos:   http://localhost:3000/projects
echo   🏠 Landing:     http://localhost:3000/minideptos
echo   🔍 Health:      http://localhost:3000/health
echo.
echo   Abriendo panel en el navegador...
echo ========================================
echo.

start http://localhost:3000/
node server.js