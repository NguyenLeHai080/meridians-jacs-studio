import os
import sys
import time
import zipfile
import hashlib
import json
import subprocess
import shutil
import paramiko

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

VERSION = "0.8.62"
NOTES = "Bản cập nhật v0.8.62: Tối ưu hóa chuyển cảnh recap mượt mà không bị ngắt quãng giữa các cảnh; Tự động đồng bộ thời lượng phân cảnh theo độ dài giọng đọc thực tế với độ trễ 0s; Đồng bộ toàn diện dữ liệu xuất video hoàn chỉnh khớp 100% dòng thời gian biên tập."

ROOT_DIR = r"d:\PROJECT\Client_Projects\meridians-jacs-studio"
APP_DIR = os.path.join(ROOT_DIR, "FE", "desktop-app")
RELEASE_DIR = os.path.join(APP_DIR, "release")
ASAR_PATH = os.path.join(RELEASE_DIR, "app.asar")
STAGING_DIR = os.path.join(RELEASE_DIR, "asar_staging")

SERVER = "221.121.1.3"
USER = "root"
PASS = r"4fT0R%GUJgh@a9Vw"

print("==================================================")
print(f"   BẮT ĐẦU BUILD VÀ XUẤT BẢN JACS STUDIO v{VERSION}")
print("==================================================")

# 1. Build Desktop Frontend
print("\n[1/5] Đang biên dịch frontend desktop-app (tsc -b && vite build)...")
cmd_build = f'cmd /c "npm.cmd --prefix \"{APP_DIR}\" run build"'
subprocess.check_call(cmd_build, shell=True)
print("✓ Build frontend thành công.")

# 2. Đóng gói app.asar
print("\n[2/5] Đang đóng gói file app.asar...")
if os.path.exists(STAGING_DIR):
    shutil.rmtree(STAGING_DIR, ignore_errors=True)
os.makedirs(STAGING_DIR, exist_ok=True)

shutil.copytree(os.path.join(APP_DIR, "dist"), os.path.join(STAGING_DIR, "dist"))
shutil.copytree(os.path.join(APP_DIR, "electron"), os.path.join(STAGING_DIR, "electron"))
shutil.copyfile(os.path.join(APP_DIR, "package.json"), os.path.join(STAGING_DIR, "package.json"))

os.makedirs(RELEASE_DIR, exist_ok=True)
cmd_asar = f'npx --yes @electron/asar pack "{STAGING_DIR}" "{ASAR_PATH}"'
subprocess.check_call(cmd_asar, shell=True, cwd=APP_DIR)
asar_size = os.path.getsize(ASAR_PATH)
print(f"✓ Đã đóng gói app.asar thành công: {asar_size / (1024*1024):.2f} MB")

# Copy to local installed JACS Studio if exists
LOCAL_INSTALLED_ASAR = r"D:\Program Files\JACS Studio\resources\app.asar"
if os.path.exists(os.path.dirname(LOCAL_INSTALLED_ASAR)):
    try:
        subprocess.run('taskkill /F /IM "JACS Studio.exe" /T', shell=True, capture_output=True)
        time.sleep(1)
        shutil.copy2(ASAR_PATH, LOCAL_INSTALLED_ASAR)
        print(f"✓ Đã sao chép app.asar trực tiếp vào cài đặt máy: {LOCAL_INSTALLED_ASAR}")
    except Exception as e:
        print(f"⚠️ Lưu ý khi copy vào local app: {e}")

# 3. Tạo các gói OTA
print("\n[3/5] Đang tạo các tệp nén OTA...")
ts = int(time.time())
zip_name = f"jacs-studio-v{VERSION}-update-{ts}.zip"
generic_zip_name = f"jacs-studio-v{VERSION}-update.zip"
quick_patch_name = "JACS-Studio-Latest-Quick-Patch.zip"

zip_path = os.path.join(RELEASE_DIR, zip_name)
generic_zip_path = os.path.join(RELEASE_DIR, generic_zip_name)
quick_patch_path = os.path.join(RELEASE_DIR, quick_patch_name)

with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(ASAR_PATH, "resources/app.asar")
    zf.write(ASAR_PATH, "app.asar")

with zipfile.ZipFile(generic_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(ASAR_PATH, "resources/app.asar")
    zf.write(ASAR_PATH, "app.asar")

with zipfile.ZipFile(quick_patch_path, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(ASAR_PATH, "resources/app.asar")
    zf.write(ASAR_PATH, "app.asar")

file_size = os.path.getsize(zip_path)
with open(zip_path, "rb") as f:
    sha512 = hashlib.sha512(f.read()).hexdigest()

download_url = f"https://jacs-studio.nexoratech.com.vn/downloads/{zip_name}"
print(f"✓ Gói OTA: {zip_name} ({file_size / (1024*1024):.2f} MB)")
print(f"✓ SHA-512: {sha512}")

# 4. Upload lên Server
print(f"\n[4/5] Kết nối SSH tới server {SERVER} và upload bản phát hành...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, port=22, username=USER, password=PASS, timeout=30)
sftp = ssh.open_sftp()

REMOTE_DOWNLOADS = "/opt/jacs-studio/downloads"
ssh.exec_command(f"mkdir -p {REMOTE_DOWNLOADS}")

print(f"Uploading {zip_name}...")
sftp.put(zip_path, f"{REMOTE_DOWNLOADS}/{zip_name}")
sftp.put(generic_zip_path, f"{REMOTE_DOWNLOADS}/{generic_zip_name}")
sftp.put(quick_patch_path, f"{REMOTE_DOWNLOADS}/{quick_patch_name}")
print("✓ Đã upload toàn bộ OTA packages lên server.")

# 5. Cập nhật Release vào PostgreSQL database (Cả Prod và Staging)
print("\n[5/5] Đang đăng ký bản phát hành vào PostgreSQL...")

now_iso = time.strftime("%Y-%m-%dT%H:%M:%S.000000+00:00", time.gmtime())

release_record = {
    "id": f"rel-v{VERSION}-win",
    "version": VERSION,
    "platform": "windows",
    "channel": "stable",
    "download_url": download_url,
    "url": download_url,
    "sha512": sha512,
    "size": file_size,
    "file_size": file_size,
    "notes": NOTES,
    "release_notes": NOTES,
    "is_mandatory": True,
    "force_update": True,
    "status": "published",
    "mandatory": True,
    "published_at": now_iso,
    "created_at": now_iso,
}

sql_content = f"""
INSERT INTO jacs_records (collection, id, data, created_at, updated_at) 
VALUES ('releases', '{release_record["id"]}', '{json.dumps(release_record).replace("'", "''")}'::jsonb, NOW(), NOW()) 
ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
"""

with sftp.file(f"/tmp/insert_v{VERSION}.sql", "w") as f:
    f.write(sql_content)

# Update Prod DB
stdin, stdout, stderr = ssh.exec_command(f"docker exec -i jacs-studio-prod-postgres-1 psql -U jacs_prod -d jacs_studio_prod < /tmp/insert_v{VERSION}.sql")
prod_res = stdout.read().decode('utf-8')
print("Prod DB Update:", prod_res.strip())

# Update Staging DB
stdin, stdout, stderr = ssh.exec_command(f"docker exec -i jacs-studio-staging-postgres-1 psql -U jacs_staging -d jacs_studio_staging < /tmp/insert_v{VERSION}.sql")
staging_res = stdout.read().decode('utf-8')
print("Staging DB Update:", staging_res.strip())

# Update universal update.ps1 on server (handles custom path and D:\Program Files)
ps1_content = rf"""# JACS Studio v{VERSION} Auto-Updater
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   CAP NHAT JACS STUDIO LEN PHIEN BAN v{VERSION}" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan

Write-Host "Dang tat tien trinh JACS Studio cu neu dang chay..." -ForegroundColor Yellow
$procs = Get-Process -Name "JACS Studio" -ErrorAction SilentlyContinue
$foundPath = $null
if ($procs) {{
    try {{
        $foundPath = $procs[0].Path
    }} catch {{}}
    Stop-Process -Name "JACS Studio" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}}

$destDir = $null
$appPath = $null

if ($foundPath -and (Test-Path (Split-Path $foundPath))) {{
    $appPath = $foundPath
    $destDir = Join-Path (Split-Path $foundPath) "resources"
}} elseif (Test-Path "D:\Program Files\JACS Studio\resources") {{
    $destDir = "D:\Program Files\JACS Studio\resources"
    $appPath = "D:\Program Files\JACS Studio\JACS Studio.exe"
}} elseif (Test-Path "C:\Program Files\JACS Studio\resources") {{
    $destDir = "C:\Program Files\JACS Studio\resources"
    $appPath = "C:\Program Files\JACS Studio\JACS Studio.exe"
}} elseif (Test-Path "$env:LOCALAPPDATA\Programs\JACS Studio\resources") {{
    $destDir = "$env:LOCALAPPDATA\Programs\JACS Studio\resources"
    $appPath = "$env:LOCALAPPDATA\Programs\JACS Studio\JACS Studio.exe"
}} else {{
    $destDir = "D:\Program Files\JACS Studio\resources"
    $appPath = "D:\Program Files\JACS Studio\JACS Studio.exe"
}}

New-Item -ItemType Directory -Force -Path $destDir | Out-Null

Write-Host "Dang tai ban cap nhat v{VERSION}..." -ForegroundColor Yellow
$zipUrl = "{download_url}"
$zipFile = "$env:TEMP\jacs_update_v{VERSION}.zip"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile -UseBasicParsing

Write-Host "Dang giai nen va ghi de file ung dung vao: $destDir..." -ForegroundColor Yellow
Expand-Archive -Path $zipFile -DestinationPath "$env:TEMP\jacs_update_extracted" -Force
Copy-Item -Path "$env:TEMP\jacs_update_extracted\resources\app.asar" -Destination "$destDir\app.asar" -Force

Remove-Item -Path $zipFile -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:TEMP\jacs_update_extracted" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Cap nhat JACS Studio v{VERSION} thanh cong 100%!" -ForegroundColor Green
if ($appPath -and (Test-Path $appPath)) {{
    Write-Host "Dang khoi dong lai JACS Studio tai: $appPath..." -ForegroundColor Cyan
    Start-Process -FilePath $appPath
}}
"""

with sftp.file(f"{REMOTE_DOWNLOADS}/update.ps1", "w") as f:
    f.write(ps1_content)

bat_content = rf"""@echo off
title Cap Nhat JACS Studio v{VERSION}
echo ===================================================
echo    DANG CAP NHAT JACS STUDIO v{VERSION}...
echo ===================================================
powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://jacs-studio.nexoratech.com.vn/downloads/update.ps1' -OutFile '%TEMP%\update_jacs.ps1'; powershell -ExecutionPolicy Bypass -File '%TEMP%\update_jacs.ps1'"
pause
"""

with sftp.file(f"{REMOTE_DOWNLOADS}/update.bat", "w") as f:
    f.write(bat_content)

# Update latest release pointer file
latest_info = {
    "version": VERSION,
    "download_url": download_url,
    "sha512": sha512,
    "file_size": file_size,
    "notes": NOTES,
    "published_at": now_iso
}
with sftp.file(f"{REMOTE_DOWNLOADS}/latest.json", "w") as f:
    f.write(json.dumps(latest_info, indent=2))

sftp.close()
ssh.close()

print(f"\n🎉 XUẤT BẢN THÀNH CÔNG BẢN CẬP NHẬT v{VERSION}!")
print(f"👉 Link OTA: {download_url}")
print(f"👉 Khách hàng mở JACS Studio sẽ tự động nhận thông báo cập nhật v{VERSION} hoặc chạy update.")
