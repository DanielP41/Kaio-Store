@echo off
title KAIO-STORE - Servidor Local
color 0A
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║         KAIO-STORE  Servidor Local       ║
echo  ╚══════════════════════════════════════════╝
echo.
echo  Iniciando servidor en http://localhost:8000
echo  Presiona Ctrl+C para detener.
echo.

:: Abrir navegador automaticamente
start "" http://localhost:8000/full.html

:: Levantar servidor
python -m http.server 8000
