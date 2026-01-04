param (
    [switch]$CheckOnly
)

# Check and Enable Windows Developer Mode
# This script is designed to fix the "Cannot create symbolic link" error in electron-builder.

$regKey = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock"
$regValueName = "AllowDevelopmentWithoutDevLicense"

function Check-DeveloperMode {
    if (Test-Path $regKey) {
        $val = Get-ItemProperty -Path $regKey -Name $regValueName -ErrorAction SilentlyContinue
        if ($null -ne $val -and $val.$regValueName -eq 1) {
            return $true
        }
    }
    return $false
}

if ($CheckOnly) {
    if (Check-DeveloperMode) {
        exit 0
    }
    else {
        Write-Host "****************************************************************" -ForegroundColor Red
        Write-Host "ERROR: Windows Developer Mode is REQUIRED for Electron builds." -ForegroundColor Red
        Write-Host "This is necessary to create symbolic links (symlinks)." -ForegroundColor Red
        Write-Host ""
        Write-Host "FIX: Please run this command in PowerShell (ADMINISTRATOR):" -ForegroundColor Yellow
        Write-Host "powershell -ExecutionPolicy Bypass -File `"$PSScriptRoot\setup-dev-mode.ps1`"" -ForegroundColor Cyan
        Write-Host "****************************************************************" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Checking Windows Developer Mode status..." -ForegroundColor Cyan

if (Check-DeveloperMode) {
    Write-Host "[OK] Developer Mode is already ENABLED." -ForegroundColor Green
}
else {
    Write-Host "[!] Developer Mode is DISABLED or not configured." -ForegroundColor Yellow
    Write-Host "Attempting to enable Developer Mode (requires Administrative privileges)..." -ForegroundColor Cyan
    
    try {
        if (-not (Test-Path $regKey)) {
            New-Item -Path $regKey -Force | Out-Null
        }
        Set-ItemProperty -Path $regKey -Name $regValueName -Value 1 -Type DWord -Force
        
        if (Check-DeveloperMode) {
            Write-Host "[SUCCESS] Developer Mode has been ENABLED." -ForegroundColor Green
            Write-Host "Please restart your terminal/IDE for changes to take effect." -ForegroundColor White
        }
        else {
            throw "Registry update failed to reflect changes."
        }
    }
    catch {
        Write-Host "[ERROR] Failed to enable Developer Mode." -ForegroundColor Red
        Write-Host "REASON: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "FIX: Please run this script in a PowerShell window as ADMINISTRATOR:" -ForegroundColor White
        Write-Host "1. Right-click Start button -> Terminal (Admin) or PowerShell (Admin)" -ForegroundColor White
        Write-Host "2. Run this script again: .\scripts\setup-dev-mode.ps1" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "If you still see errors, try clearing the electron-builder cache:" -ForegroundColor Gray
Write-Host "Remove-Item -Recurse -Force `"`$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign`"" -ForegroundColor Gray
