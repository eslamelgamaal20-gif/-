@echo off
title EMG Uninstaller
set "DEST=%APPDATA%\Adobe\CEP\extensions\com.promptstudio.cep"
if exist "%DEST%" (
  rmdir /s /q "%DEST%"
  echo EMG was removed. Restart Photoshop.
) else (
  echo EMG is not installed.
)
pause
