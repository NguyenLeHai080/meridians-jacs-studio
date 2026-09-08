import time
import os
import sys
import io
import zipfile
import hashlib
import subprocess
import shutil
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

ROOT_DIR = r"d:\PROJECT\Client_Projects\meridians-jacs-studio"
APP_DIR = os.path.join(ROOT_DIR, "FE", "desktop-app")
ADMIN_DIR = os.path.join(ROOT_DIR, "FE", "admin-portal")
BE_DIR = os.path.join(ROOT_DIR, "BE", "api-server")
RELEASE_DIR = os.path.join(APP_DIR, "release")
ASAR_PATH = os.path.join(RELEASE_DIR, "app.asar")
STAGING_DIR = os.path.join(RELEASE_DIR, "asar_staging")

VERSION = "0.8.37"
TIMESTAMP = int(time.time())

SERVER = "221.121.1.3"
USER = "root"
PASS = r"4fT0R%GUJgh@a9Vw"

print(f"=== BẮT ĐẦU BUILD VÀ DEPLOY JACS STUDIO v{VERSION} ===")

# 0. Build Desktop Frontend
print("0. Đang build desktop-app...")
cmd_build = f'cmd /c "npm.cmd --prefix \"{APP_DIR}\" run build"'
subprocess.check_call(cmd_build, shell=True)

# 1. Đóng gói app.asar
print("1. Chuẩn bị thư mục đóng gói asar...")
if os.path.exists(STAGING_DIR):
    shutil.rmtree(STAGING_DIR)
os.makedirs(STAGING_DIR, exist_ok=True)

shutil.copytree(os.path.join(APP_DIR, "dist"), os.path.join(STAGING_DIR, "dist"))
shutil.copytree(os.path.join(APP_DIR, "electron"), os.path.join(STAGING_DIR, "electron"))
shutil.copy2(os.path.join(APP_DIR, "package.json"), os.path.join(STAGING_DIR, "package.json"))

print("2. Đóng gói file app.asar...")
os.makedirs(RELEASE_DIR, exist_ok=True)
cmd = f'cmd /c "npx asar pack \"{STAGING_DIR}\" \"{ASAR_PATH}\""'
subprocess.check_call(cmd, shell=True, cwd=APP_DIR)
asar_size = os.path.getsize(ASAR_PATH)
print(f"✅ Đã đóng gói app.asar thành công: {asar_size / (1024*1024):.2f} MB")

# Copy directly to local installed JACS Studio
LOCAL_INSTALLED_ASAR = r"D:\Program Files\JACS Studio\resources\app.asar"
if os.path.exists(os.path.dirname(LOCAL_INSTALLED_ASAR)):
    try:
        subprocess.run('taskkill /F /IM "JACS Studio.exe" /T', shell=True, capture_output=True)
        time.sleep(1)
        shutil.copy2(ASAR_PATH, LOCAL_INSTALLED_ASAR)
        print(f"✅ Đã sao chép app.asar trực tiếp vào cài đặt máy: {LOCAL_INSTALLED_ASAR}")
    except Exception as e:
        print(f"⚠️ Không thể copy vào local app: {e}")

# 2. Tạo các gói cập nhật OTA
ZIP_NAME = f"jacs-studio-v{VERSION}-update-{TIMESTAMP}.zip"
GENERIC_ZIP_NAME = f"jacs-studio-v{VERSION}-update.zip"
QUICK_PATCH_NAME = "JACS-Studio-Latest-Quick-Patch.zip"

ZIP_PATH = os.path.join(RELEASE_DIR, ZIP_NAME)
GENERIC_ZIP_PATH = os.path.join(RELEASE_DIR, GENERIC_ZIP_NAME)
QUICK_PATCH_PATH = os.path.join(RELEASE_DIR, QUICK_PATCH_NAME)

print(f"📦 Đang tạo các tệp nén OTA ({ZIP_NAME})...")
with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(ASAR_PATH, "resources/app.asar")
    zf.write(ASAR_PATH, "app.asar")

with zipfile.ZipFile(GENERIC_ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(ASAR_PATH, "resources/app.asar")
    zf.write(ASAR_PATH, "app.asar")

with zipfile.ZipFile(QUICK_PATCH_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(ASAR_PATH, "resources/app.asar")
    zf.write(ASAR_PATH, "app.asar")

file_size = os.path.getsize(ZIP_PATH)
with open(ZIP_PATH, "rb") as f:
    sha512 = hashlib.sha512(f.read()).hexdigest()

DOWNLOAD_URL = f"https://jacs-studio.nexoratech.com.vn/downloads/{ZIP_NAME}"
print(f"✅ Gói cập nhật OTA v{VERSION} đã sẵn sàng ({file_size / (1024*1024):.2f} MB)")

# 3. Kết nối SSH
print(f"\n📡 Đang kết nối tới server {SERVER} qua SSH/SFTP...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, port=22, username=USER, password=PASS, timeout=25)
sftp = ssh.open_sftp()

# 4. Upload OTA files
REMOTE_DOWNLOADS = "/opt/jacs-studio/downloads"
ssh.exec_command(f"mkdir -p {REMOTE_DOWNLOADS}")
print(f"⬆️ Đang upload OTA {ZIP_NAME}...")
sftp.put(ZIP_PATH, f"{REMOTE_DOWNLOADS}/{ZIP_NAME}")
sftp.put(GENERIC_ZIP_PATH, f"{REMOTE_DOWNLOADS}/{GENERIC_ZIP_NAME}")
sftp.put(QUICK_PATCH_PATH, f"{REMOTE_DOWNLOADS}/{QUICK_PATCH_NAME}")
print("✅ Đã upload toàn bộ OTA files lên server")

# 5. Update PostgreSQL Releases Table
print("\n📝 Đang cập nhật cơ sở dữ liệu Releases trên Server...")
notes = f"Phiên bản {VERSION}: Tối ưu hóa hiệu năng Render chống đơ máy, phân bổ luồng CPU an toàn, giảm độ ưu tiên tiến trình FFmpeg, chống tràn RAM."

db_script = f"""
import psycopg
import json
import os
from datetime import datetime, UTC

db_url = os.environ.get("JACS_DATABASE_URL", "postgresql://jacs_prod:bbfb7e4e984a4672e16de59333ea648714f1a3327621c934@postgres:5432/jacs_studio_prod")

data = {{
    "version": "{VERSION}",
    "platform": "windows",
    "channel": "stable",
    "download_url": "{DOWNLOAD_URL}",
    "sha512": "{sha512}",
    "file_size": {file_size},
    "notes": "{notes}",
    "is_mandatory": True,
    "published_at": datetime.now(UTC).isoformat()
}}

try:
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM jacs_records WHERE collection='releases' AND data->>'version'=%s AND data->>'platform'='windows'", ("{VERSION}",))
            row = cur.fetchone()
            if row:
                cur.execute("UPDATE jacs_records SET data=%s WHERE id=%s", (json.dumps(data), row[0]))
                print(f"Updated existing release {VERSION} (id: {{row[0]}})")
            else:
                rel_id = f"rel-v{VERSION}-win"
                cur.execute("INSERT INTO jacs_records (id, collection, data) VALUES (%s, 'releases', %s)", (rel_id, json.dumps(data)))
                print(f"Inserted new release {VERSION} (id: {{rel_id}})")
        conn.commit()
    print("SUCCESS")
except Exception as e:
    print(f"Error: {{e}}")
"""

with sftp.file("/tmp/update_db_release.py", "w") as f:
    f.write(db_script)

stdin, stdout, stderr = ssh.exec_command("docker cp /tmp/update_db_release.py jacs-studio-prod-api-1:/tmp/update_db_release.py && docker exec jacs-studio-prod-api-1 python3 /tmp/update_db_release.py")
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print(f"Warning: {err}")

sftp.close()
ssh.close()
print(f"\n🎉 HOÀN TẤT TRIỂN KHAI PHIÊN BẢN v{VERSION} THÀNH CÔNG RỰC RỠ!")
