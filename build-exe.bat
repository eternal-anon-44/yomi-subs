@echo off
:: Yomi-Subs v2 — Compile launcher.ps1 to a standalone .exe using ps2exe
:: Requires: Install-Module ps2exe  (run once in PowerShell as admin)
::
:: If ps2exe is unavailable, users can also:
::   1. Right-click launcher.ps1 → Run with PowerShell, OR
::   2. Pin a shortcut that runs:
::      powershell.exe -ExecutionPolicy Bypass -File "%~dp0launcher.ps1"

echo.
echo   Building Yomi-Subs-Launcher.exe with ps2exe...
echo.

powershell.exe -ExecutionPolicy Bypass -Command ^
  "if (-not (Get-Module -ListAvailable -Name ps2exe)) { ^
     Write-Host 'Installing ps2exe...' -ForegroundColor Yellow; ^
     Install-Module ps2exe -Scope CurrentUser -Force ^
   }; ^
   Import-Module ps2exe; ^
   Invoke-ps2exe -InputFile '%~dp0launcher.ps1' ^
                 -OutputFile '%~dp0Yomi-Subs-Launcher.exe' ^
                 -NoConsole:$false ^
                 -Title 'Yomi-Subs Launcher' ^
                 -Description 'Starts the Yomi-Subs v2 local transcription backend' ^
                 -Company 'yomi-subs' ^
                 -Version '2.0.0.0'; ^
   Write-Host '' ; ^
   Write-Host '  Built: Yomi-Subs-Launcher.exe' -ForegroundColor Green"

echo.
pause
