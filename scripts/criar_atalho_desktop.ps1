# Script para criar atalhos na Área de Trabalho do Windows
$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$DesktopPath = [Environment]::GetFolderPath("Desktop")

# Se o Desktop estiver no OneDrive ou local, verifica a existência
if (-not (Test-Path $DesktopPath)) {
    $DesktopPath = Join-Path $env:USERPROFILE "Desktop"
}

Write-Host "Criando atalhos em: $DesktopPath" -ForegroundColor Cyan

$WshShell = New-Object -ComObject WScript.Shell

# 1. Atalho Principal: Karaoke Studio
$LauncherVbs = Join-Path $ProjectRoot "iniciar_karaoke_silencioso.vbs"
$MainShortcutPath = Join-Path $DesktopPath "Karaoke Studio.lnk"
$Shortcut = $WshShell.CreateShortcut($MainShortcutPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$LauncherVbs`""
$Shortcut.WorkingDirectory = $ProjectRoot
$Shortcut.Description = "Iniciar e abrir o Karaoke Studio no Navegador"
# Ícone de som / multimídia
$Shortcut.IconLocation = "$env:SystemRoot\system32\shell32.dll,116"
$Shortcut.Save()
Write-Host "Atalho 'Karaoke Studio' criado com sucesso!" -ForegroundColor Green

# 2. Atalho Auxiliar: Encerrar Karaoke Studio
$StopBat = Join-Path $ProjectRoot "encerrar_karaoke.bat"
$StopShortcutPath = Join-Path $DesktopPath "Encerrar Karaoke Studio.lnk"
$StopShortcut = $WshShell.CreateShortcut($StopShortcutPath)
$StopShortcut.TargetPath = $StopBat
$StopShortcut.WorkingDirectory = $ProjectRoot
$StopShortcut.Description = "Finalizar servidores do Karaoke Studio em segundo plano"
$StopShortcut.IconLocation = "$env:SystemRoot\system32\shell32.dll,131"
$StopShortcut.Save()
Write-Host "Atalho 'Encerrar Karaoke Studio' criado com sucesso!" -ForegroundColor Green
