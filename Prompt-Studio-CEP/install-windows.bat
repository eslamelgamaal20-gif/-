@echo off
title EMG Installer
echo.
echo  ==========================================
echo    EMG - Photoshop Panel Installer (Arabic UI)
echo    (No Creative Cloud required)
echo  ==========================================
echo.
echo  Please CLOSE Photoshop before continuing.
pause

echo.
echo  [1/2] Enabling unsigned extensions (PlayerDebugMode)...
for %%v in (9 10 11 12) do reg add "HKCU\Software\Adobe\CSXS.%%v" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul

echo  [2/2] Copying files...
set "DEST=%APPDATA%\Adobe\CEP\extensions\com.promptstudio.cep"
if exist "%DEST%" rmdir /s /q "%DEST%"
mkdir "%DEST%"
xcopy "%~dp0*" "%DEST%\" /E /I /Y /Q >nul

if exist "%DEST%\CSXS\manifest.xml" (
  echo.
  echo  SUCCESS! Installed to:
  echo  %DEST%
  echo.
  echo  Now open Photoshop and go to:
  echo    Window ^> Extensions ^(legacy^) ^> EMG
  echo  ^(Photoshop 2020: Window ^> Extensions ^> EMG^)
) else (
  echo.
  echo  ERROR: files were not copied. Make sure you extracted the ZIP first
  echo  ^(do not run this file from inside the ZIP^).
)
echo.
pause
