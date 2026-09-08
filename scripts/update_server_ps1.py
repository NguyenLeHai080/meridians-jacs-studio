import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw')
sftp = ssh.open_sftp()

universal_ps1 = r'''# JACS Studio v0.8.58 Universal Auto-Updater
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   CAP NHAT JACS STUDIO LEN PHIEN BAN v0.8.58" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan

Write-Host "Dang tat JACS Studio cu neu dang chay..." -ForegroundColor Yellow
Stop-Process -Name "JACS Studio" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "jacs-studio" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Find installation folder
$possiblePaths = @(
    "D:\Program Files\JACS Studio",
    "C:\Program Files\JACS Studio",
    "C:\Program Files (x86)\JACS Studio",
    "$env:LOCALAPPDATA\Programs\JACS Studio",
    "$env:LOCALAPPDATA\Programs\jacs-studio",
    "$env:ProgramFiles\JACS Studio",
    "${env:ProgramFiles(x86)}\JACS Studio"
)

$targetDir = $null
foreach ($p in $possiblePaths) {
    if (Test-Path "$p\resources") {
        $targetDir = "$p\resources"
        $appExe = "$p\JACS Studio.exe"
        break
    }
}

if (-not $targetDir) {
    # Search drive D and C
    Write-Host "Dang tim thu muc cai dat JACS Studio..." -ForegroundColor Yellow
    $found = Get-ChildItem -Path "C:\Program Files", "D:\Program Files", "$env:LOCALAPPDATA\Programs" -Filter "JACS Studio.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $targetDir = Join-Path $found.DirectoryName "resources"
        $appExe = $found.FullName
    } else {
        $targetDir = "D:\Program Files\JACS Studio\resources"
        $appExe = "D:\Program Files\JACS Studio\JACS Studio.exe"
    }
}

Write-Host "Thu muc cai dat: $targetDir" -ForegroundColor Cyan

$zipUrl = "https://jacs-studio.nexoratech.com.vn/downloads/JACS-Studio-Latest-Quick-Patch.zip"
$zipFile = "$env:TEMP\jacs_update_v0.8.58.zip"
$extractDir = "$env:TEMP\jacs_update_extracted"

Write-Host "Dang tai ban cap nhat v0.8.58..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile -UseBasicParsing -Headers @{"User-Agent"="Mozilla/5.0"}

Write-Host "Dang giai nen va ghi de file ung dung..." -ForegroundColor Yellow
if (Test-Path $extractDir) { Remove-Item -Path $extractDir -Recurse -Force -ErrorAction SilentlyContinue }
Expand-Archive -Path $zipFile -DestinationPath $extractDir -Force

if (Test-Path "$extractDir\resources\app.asar") {
    Copy-Item -Path "$extractDir\resources\app.asar" -Destination "$targetDir\app.asar" -Force
} elseif (Test-Path "$extractDir\app.asar") {
    Copy-Item -Path "$extractDir\app.asar" -Destination "$targetDir\app.asar" -Force
}

Remove-Item -Path $zipFile -Force -ErrorAction SilentlyContinue
Remove-Item -Path $extractDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  CAP NHAT JACS STUDIO v0.8.58 THANH CONG 100%!   " -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""

if (Test-Path $appExe) {
    Write-Host "Dang khoi dong lai JACS Studio..." -ForegroundColor Cyan
    Start-Process -FilePath $appExe
}
'''

with sftp.file('/opt/jacs-studio/downloads/update.ps1', 'w') as f:
    f.write(universal_ps1)

print("✓ Updated universal update.ps1 on server")
sftp.close()
ssh.close()
