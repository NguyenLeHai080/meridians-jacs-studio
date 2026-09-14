import os
import sys
import time
import hashlib
import json
import shutil
import paramiko

VERSION = "0.8.76"
NOTES = "Bản cập nhật v0.8.76 (Windows): Bộ cài đặt chuẩn Windows x64 (NSIS Setup .exe) & Bản nén Portable (.zip); Tự động trích xuất và đồng bộ phụ đề Karaoke từng từ (Word-by-Word Subtitles) trực tiếp từ âm thanh giọng đọc AI (Edge TTS Word Boundaries) với độ chính xác tuyệt đối từng mili-giây, loại bỏ 100% hiện tượng lệch chữ hay trễ tiếng; Tối ưu hóa toàn diện hiệu năng và giao diện."

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
APP_DIR = os.path.join(ROOT_DIR, "FE", "desktop-app")
RELEASE_DIR = os.path.join(APP_DIR, "release")

SERVER = "221.121.1.3"
USER = "root"
PASS = "4fT0R%GUJgh@a9Vw"
REMOTE_DOWNLOADS = "/opt/jacs-studio/downloads"

EXE_LOCAL = os.path.join(RELEASE_DIR, f"JACS Studio Setup {VERSION}.exe")
ZIP_LOCAL = os.path.join(RELEASE_DIR, f"JACS Studio-{VERSION}-win.zip")

EXE_REMOTE_VERSIONED = f"jacs-studio-{VERSION}-windows-setup.exe"
EXE_REMOTE_LATEST = "jacs-studio-windows-setup.exe"
ZIP_REMOTE_VERSIONED = f"jacs-studio-{VERSION}-windows.zip"
ZIP_REMOTE_LATEST = "jacs-studio-windows-latest.zip"

print("==================================================")
print(f"  UPLOAD BỘ CÀI ĐẶT WINDOWS JACS STUDIO v{VERSION}")
print("==================================================")

if not os.path.exists(EXE_LOCAL):
    print(f"❌ Không tìm thấy file {EXE_LOCAL}")
    sys.exit(1)

if not os.path.exists(ZIP_LOCAL):
    print(f"❌ Không tìm thấy file {ZIP_LOCAL}")
    sys.exit(1)

exe_size = os.path.getsize(EXE_LOCAL)
print(f"✓ NSIS Installer: {EXE_LOCAL} ({exe_size / (1024*1024):.2f} MB)")
with open(EXE_LOCAL, "rb") as f:
    exe_sha512 = hashlib.sha512(f.read()).hexdigest()

zip_size = os.path.getsize(ZIP_LOCAL)
print(f"✓ Portable ZIP: {ZIP_LOCAL} ({zip_size / (1024*1024):.2f} MB)")
with open(ZIP_LOCAL, "rb") as f:
    zip_sha512 = hashlib.sha512(f.read()).hexdigest()

print(f"\nKết nối SSH tới {SERVER}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, port=22, username=USER, password=PASS, timeout=30)
sftp = ssh.open_sftp()

def progress_cb(name):
    last = [0]
    def cb(transferred, total):
        pct = int(transferred / total * 100)
        if pct >= last[0] + 20 or pct == 100:
            last[0] = pct
            print(f"  {name}: {pct}% ({transferred / (1024*1024):.1f}/{total / (1024*1024):.1f} MB)")
    return cb

# 1. Upload Windows Setup .exe
print(f"\nUploading {EXE_REMOTE_VERSIONED}...")
sftp.put(EXE_LOCAL, f"{REMOTE_DOWNLOADS}/{EXE_REMOTE_VERSIONED}", callback=progress_cb("setup.exe"))
print(f"Creating latest setup alias: {EXE_REMOTE_LATEST}...")
ssh.exec_command(f"cp -f {REMOTE_DOWNLOADS}/{EXE_REMOTE_VERSIONED} {REMOTE_DOWNLOADS}/{EXE_REMOTE_LATEST}")

# 2. Upload Windows Portable .zip
print(f"\nUploading {ZIP_REMOTE_VERSIONED}...")
sftp.put(ZIP_LOCAL, f"{REMOTE_DOWNLOADS}/{ZIP_REMOTE_VERSIONED}", callback=progress_cb("portable.zip"))
print(f"Creating latest portable alias: {ZIP_REMOTE_LATEST}...")
ssh.exec_command(f"cp -f {REMOTE_DOWNLOADS}/{ZIP_REMOTE_VERSIONED} {REMOTE_DOWNLOADS}/{ZIP_REMOTE_LATEST}")

# Set permissions
ssh.exec_command(f"chmod 755 {REMOTE_DOWNLOADS}/{EXE_REMOTE_VERSIONED} {REMOTE_DOWNLOADS}/{EXE_REMOTE_LATEST} {REMOTE_DOWNLOADS}/{ZIP_REMOTE_VERSIONED} {REMOTE_DOWNLOADS}/{ZIP_REMOTE_LATEST}")

# 3. Update PostgreSQL release records for Windows
print("\nCập nhật bản ghi Release Windows trong PostgreSQL...")
now_iso = time.strftime("%Y-%m-%dT%H:%M:%S.000000+00:00", time.gmtime())

exe_download_url = f"https://jacs-studio.nexoratech.com.vn/downloads/{EXE_REMOTE_VERSIONED}"
zip_download_url = f"https://jacs-studio.nexoratech.com.vn/downloads/{ZIP_REMOTE_VERSIONED}"

win_release = {
    "id": f"rel-v{VERSION}-win",
    "version": VERSION,
    "platform": "windows",
    "channel": "stable",
    "download_url": exe_download_url,
    "url": exe_download_url,
    "installer_url": exe_download_url,
    "portable_url": zip_download_url,
    "sha512": exe_sha512,
    "size": exe_size,
    "file_size": exe_size,
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
"""

with sftp.file(f"/tmp/update_win_v{VERSION}.sql", "w") as f:
    f.write(sql_content)

# Update Prod DB
stdin, stdout, stderr = ssh.exec_command(f"docker exec -i jacs-studio-prod-postgres-1 psql -U jacs_prod -d jacs_studio_prod < /tmp/update_win_v{VERSION}.sql")
prod_res = stdout.read().decode('utf-8')
print("Prod DB Update:", prod_res.strip())

# Update Staging DB
stdin, stdout, stderr = ssh.exec_command(f"docker exec -i jacs-studio-staging-postgres-1 psql -U jacs_staging -d jacs_studio_staging < /tmp/update_win_v{VERSION}.sql")
staging_res = stdout.read().decode('utf-8')
print("Staging DB Update:", staging_res.strip())

sftp.close()
ssh.close()

print(f"\n🎉 XUẤT BẢN THÀNH CÔNG BỘ CÀI WINDOWS v{VERSION} LÊN SERVER!")
print(f"👉 Link Windows Installer (.exe): {exe_download_url}")
print(f"👉 Link Windows Installer (Latest): https://jacs-studio.nexoratech.com.vn/downloads/{EXE_REMOTE_LATEST}")
print(f"👉 Link Windows Portable (.zip): {zip_download_url}")
print(f"👉 Link Windows Portable (Latest): https://jacs-studio.nexoratech.com.vn/downloads/{ZIP_REMOTE_LATEST}")
