import os
import sys
import time
import zipfile
import hashlib
import json
import subprocess
import shutil
import paramiko

VERSION = "0.8.75"
NOTES = "Bản cập nhật v0.8.75: Khắc phục triệt để lỗi hiển thị kịch bản và phân cảnh Timeline Studio (bảo vệ kịch bản không bị xóa/trắng khi chuyển trang); Chuẩn hóa luồng hàng đợi: Bảng \"Nguồn Video Từ Timeline\" chỉ nạp các video đã hoàn tất dựng từ Timeline; Tách biệt 100% bản ghi render với video nguồn gốc để chống xóa nhầm khi dọn dẹp hàng đợi; Tối ưu xuất video hàng loạt tuần tự bảo vệ RAM và chống đơ máy."

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
APP_DIR = os.path.join(ROOT_DIR, "FE", "desktop-app")
RELEASE_DIR = os.path.join(APP_DIR, "release")
ASAR_PATH = os.path.join(RELEASE_DIR, "app.asar")
STAGING_DIR = os.path.join(RELEASE_DIR, "asar_staging")

SERVER = "221.121.1.3"
USER = "root"
PASS = "4fT0R%GUJgh@a9Vw"

print("==================================================")
print(f"   BẮT ĐẦU BUILD VÀ XUẤT BẢN JACS STUDIO v{VERSION}")
print("==================================================")

# 1. Build Desktop Frontend
print("\n[1/5] Đang kiểm tra frontend desktop-app...")
if not os.path.exists(os.path.join(APP_DIR, "dist")):
    print("Biên dịch frontend (npm run build)...")
    subprocess.check_call(["npm", "run", "build"], cwd=APP_DIR)
print("✓ Frontend sẵn sàng.")

# 2. Đóng gói app.asar
print("\n[2/5] Đang đóng gói file app.asar...")
if os.path.exists(STAGING_DIR):
    shutil.rmtree(STAGING_DIR, ignore_errors=True)
os.makedirs(STAGING_DIR, exist_ok=True)

shutil.copytree(os.path.join(APP_DIR, "dist"), os.path.join(STAGING_DIR, "dist"))
shutil.copytree(os.path.join(APP_DIR, "electron"), os.path.join(STAGING_DIR, "electron"))
if os.path.exists(os.path.join(APP_DIR, "voice-runtime")):
    shutil.copytree(os.path.join(APP_DIR, "voice-runtime"), os.path.join(STAGING_DIR, "voice-runtime"))
shutil.copyfile(os.path.join(APP_DIR, "package.json"), os.path.join(STAGING_DIR, "package.json"))

os.makedirs(RELEASE_DIR, exist_ok=True)
cmd_asar = f'npx --yes asar pack "{STAGING_DIR}" "{ASAR_PATH}"'
subprocess.check_call(cmd_asar, shell=True, env=os.environ, cwd=APP_DIR)
asar_size = os.path.getsize(ASAR_PATH)
print(f"✓ Đã đóng gói app.asar thành công: {asar_size / (1024*1024):.2f} MB")

# Cập nhật app trên macOS local nếu có
LOCAL_MAC_ASAR = "/Applications/JACS Studio.app/Contents/Resources/app.asar"
if os.path.exists(os.path.dirname(LOCAL_MAC_ASAR)):
    try:
        shutil.copyfile(ASAR_PATH, LOCAL_MAC_ASAR)
        print(f"✓ Đã cập nhật trực tiếp vào ứng dụng macOS: {LOCAL_MAC_ASAR}")
    except Exception as e:
        print(f"⚠️ Không thể sao chép trực tiếp vào macOS app: {e}")

# 3. Tạo các tệp nén OTA
print("\n[3/5] Đang tạo các tệp nén OTA...")
ts = int(time.time())
zip_name = f"jacs-studio-v{VERSION}-update-{ts}.zip"
zip_path = os.path.join(RELEASE_DIR, zip_name)
generic_zip_name = f"jacs-studio-v{VERSION}-update.zip"
generic_zip_path = os.path.join(RELEASE_DIR, generic_zip_name)
quick_patch_name = "jacs-studio-update.zip"
quick_patch_path = os.path.join(RELEASE_DIR, quick_patch_name)

for p in [zip_path, generic_zip_path, quick_patch_path]:
    with zipfile.ZipFile(p, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(ASAR_PATH, "resources/app.asar")
        zf.write(ASAR_PATH, "app.asar")

file_size = os.path.getsize(zip_path)
with open(zip_path, "rb") as f:
    sha512 = hashlib.sha512(f.read()).hexdigest()

download_url = f"https://jacs-studio.nexoratech.com.vn/downloads/{zip_name}"
print(f"✓ Gói OTA: {zip_name} ({file_size / (1024*1024):.2f} MB)")
print(f"✓ SHA-512: {sha512}")

# Chuẩn bị file macOS Universal nếu đã build
mac_universal_zip = os.path.join(RELEASE_DIR, f"JACS Studio-{VERSION}-universal-mac.zip")
mac_universal_dmg = os.path.join(RELEASE_DIR, f"JACS Studio-{VERSION}-universal.dmg")
pub_mac_zip = os.path.join(RELEASE_DIR, f"jacs-studio-{VERSION}-macos-universal.zip")
pub_mac_dmg = os.path.join(RELEASE_DIR, f"jacs-studio-{VERSION}-macos-universal.dmg")

has_mac_universal = False
if os.path.exists(mac_universal_zip) and os.path.exists(mac_universal_dmg):
    shutil.copyfile(mac_universal_zip, pub_mac_zip)
    shutil.copyfile(mac_universal_dmg, pub_mac_dmg)
    has_mac_universal = True
    print(f"✓ Sẵn sàng macOS Universal: {os.path.basename(pub_mac_dmg)}")

# 4. Upload lên Server
print(f"\n[4/5] Kết nối SSH tới server {SERVER} và upload bản phát hành...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, port=22, username=USER, password=PASS, timeout=30)
sftp = ssh.open_sftp()

REMOTE_DOWNLOADS = "/opt/jacs-studio/downloads"
ssh.exec_command(f"mkdir -p {REMOTE_DOWNLOADS}")

def progress_cb(name):
    last = [0]
    def cb(transferred, total):
        pct = int(transferred / total * 100)
        if pct >= last[0] + 25 or pct == 100:
            last[0] = pct
            print(f"  {name}: {pct}% ({transferred / (1024*1024):.1f}/{total / (1024*1024):.1f} MB)")
    return cb

print(f"Uploading {zip_name}...")
sftp.put(zip_path, f"{REMOTE_DOWNLOADS}/{zip_name}", callback=progress_cb(zip_name))
sftp.put(generic_zip_path, f"{REMOTE_DOWNLOADS}/{generic_zip_name}")
sftp.put(quick_patch_path, f"{REMOTE_DOWNLOADS}/{quick_patch_name}")

if has_mac_universal:
    print(f"Uploading {os.path.basename(pub_mac_zip)}...")
    sftp.put(pub_mac_zip, f"{REMOTE_DOWNLOADS}/{os.path.basename(pub_mac_zip)}", callback=progress_cb("mac-universal.zip"))
    print(f"Uploading {os.path.basename(pub_mac_dmg)}...")
    sftp.put(pub_mac_dmg, f"{REMOTE_DOWNLOADS}/{os.path.basename(pub_mac_dmg)}", callback=progress_cb("mac-universal.dmg"))

print("✓ Đã upload các gói phát hành lên server.")

# 5. Cập nhật Release vào PostgreSQL database (Cả Prod và Staging)
print("\n[5/5] Đang đăng ký bản phát hành vào PostgreSQL...")
now_iso = time.strftime("%Y-%m-%dT%H:%M:%S.000000+00:00", time.gmtime())

# Win Release Record
win_release = {
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

# Mac Release Record
mac_download_url = f"https://jacs-studio.nexoratech.com.vn/downloads/{os.path.basename(pub_mac_zip)}" if has_mac_universal else download_url
mac_file_size = os.path.getsize(pub_mac_zip) if has_mac_universal else file_size
with open(pub_mac_zip if has_mac_universal else zip_path, "rb") as f:
    mac_sha512 = hashlib.sha512(f.read()).hexdigest()

mac_release = {
    "id": f"rel-v{VERSION}-mac",
    "version": VERSION,
    "platform": "macos",
    "channel": "stable",
    "download_url": mac_download_url,
    "url": mac_download_url,
    "sha512": mac_sha512,
    "size": mac_file_size,
    "file_size": mac_file_size,
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
VALUES ('releases', '{win_release["id"]}', '{json.dumps(win_release).replace("'", "''")}'::jsonb, NOW(), NOW()) 
ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();

INSERT INTO jacs_records (collection, id, data, created_at, updated_at) 
VALUES ('releases', '{mac_release["id"]}', '{json.dumps(mac_release).replace("'", "''")}'::jsonb, NOW(), NOW()) 
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

# Update update.ps1 on server
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

# Update latest.json
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

print(f"\n🎉 XUẤT BẢN THÀNH CÔNG BẢN CẬP NHẬT v{VERSION} LÊN SERVER!")
print(f"👉 Link OTA Windows: {download_url}")
if has_mac_universal:
    print(f"👉 Link macOS Universal DMG: https://jacs-studio.nexoratech.com.vn/downloads/{os.path.basename(pub_mac_dmg)}")
    print(f"👉 Link macOS Universal ZIP: {mac_download_url}")
print(f"👉 Client mở JACS Studio sẽ tự động nhận thông báo nâng cấp v{VERSION}.")
