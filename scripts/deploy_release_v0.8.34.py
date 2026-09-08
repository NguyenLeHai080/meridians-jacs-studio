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
RELEASE_DIR = os.path.join(APP_DIR, "release")
ASAR_PATH = os.path.join(RELEASE_DIR, "app.asar")
STAGING_DIR = os.path.join(RELEASE_DIR, "asar_staging")

VERSION = "0.8.34"
TIMESTAMP = int(time.time())

# 0. Build Frontend
print("0. Đang build desktop-app...")
cmd_build = 'cmd /c "npx pnpm --filter @jacs/desktop-app build"'
subprocess.check_call(cmd_build, shell=True, cwd=ROOT_DIR)

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
        # Kill running instances if any
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
print(f"🔑 SHA-512: {sha512}")
print(f"🔗 Download URL: {DOWNLOAD_URL}")

# 3. Tải lên Server qua SSH/SFTP
SERVER = "221.121.1.3"
USER = "root"
PASS = r"4fT0R%GUJgh@a9Vw"
REMOTE_DIR = "/opt/jacs-studio/downloads"

print(f"\n📡 Đang kết nối tới server {SERVER} qua SSH/SFTP...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, port=22, username=USER, password=PASS, timeout=25)
sftp = ssh.open_sftp()

print(f"⬆️ Đang tải {ZIP_NAME} lên {REMOTE_DIR}/{ZIP_NAME}...")
sftp.put(ZIP_PATH, f"{REMOTE_DIR}/{ZIP_NAME}")

print(f"⬆️ Đang tải {GENERIC_ZIP_NAME} lên {REMOTE_DIR}/{GENERIC_ZIP_NAME}...")
sftp.put(GENERIC_ZIP_PATH, f"{REMOTE_DIR}/{GENERIC_ZIP_NAME}")

print(f"⬆️ Đang tải {QUICK_PATCH_NAME} lên {REMOTE_DIR}/{QUICK_PATCH_NAME}...")
sftp.put(QUICK_PATCH_PATH, f"{REMOTE_DIR}/{QUICK_PATCH_NAME}")

# Also update the standalone Windows zip on server with new app.asar
print("🔄 Cập nhật standalone Windows bundle trên server...")
cmd_unzip = f"""
cd /opt/jacs-studio/downloads
mkdir -p /tmp/patch_win_asar/resources
cp {REMOTE_DIR}/{ZIP_NAME} /tmp/patch_win_asar/update.zip
unzip -o /tmp/patch_win_asar/update.zip -d /tmp/patch_win_asar/ > /dev/null 2>&1
if [ -f /tmp/patch_win_asar/resources/app.asar ]; then
    cp /tmp/patch_win_asar/resources/app.asar /tmp/patch_win_asar/app.asar
fi

for z in jacs-studio-v{VERSION}-windows.zip jacs-studio-windows-latest.zip jacs-studio-v0.8.33-windows.zip; do
    if [ -f "$z" ]; then
        echo "Updating $z..."
        (cd /tmp/patch_win_asar && zip -u {REMOTE_DIR}/$z resources/app.asar > /dev/null 2>&1 || true)
    fi
done
rm -rf /tmp/patch_win_asar
"""
stdin, stdout, stderr = ssh.exec_command(cmd_unzip)
stdout.read()

sftp.close()
print("✅ Tải lên server thành công!")

# 4. Cập nhật Release vào PostgreSQL DB trên server
print("\n🗄️ Cập nhật thông tin Release v0.8.34 vào Database trên server...")

release_notes = "Bản phát hành v0.8.34: Giám sát toàn diện 100% lượt gọi AI request & đo độ trễ thời gian thực cho Desktop Tool."
db_script = f"""
import psycopg
import json
from datetime import datetime, UTC

dsn_prod = "postgresql://jacs_prod:4fT0R%25GUJgh%40a9Vw@localhost:5432/jacs_studio_prod"
dsn_staging = "postgresql://jacs_staging:4fT0R%25GUJgh%40a9Vw@localhost:5432/jacs_studio_staging"

data = {{
    "version": "{VERSION}",
    "platform": "windows",
    "channel": "stable",
    "download_url": "{DOWNLOAD_URL}",
    "sha512": "{sha512}",
    "file_size": {file_size},
    "notes": "{release_notes}",
    "is_mandatory": True,
    "published_at": datetime.now(UTC).isoformat()
}}

for dsn, name in [(dsn_prod, "PROD"), (dsn_staging, "STAGING")]:
    try:
        with psycopg.connect(dsn) as conn:
            with conn.cursor() as cur:
                # Update existing or insert
                cur.execute("SELECT id FROM jacs_records WHERE collection='releases' AND data->>'version'=%s AND data->>'platform'='windows'", ("{VERSION}",))
                row = cur.fetchone()
                if row:
                    cur.execute("UPDATE jacs_records SET data=%s WHERE id=%s", (json.dumps(data), row[0]))
                    print(f"[{{name}}] Updated existing release {VERSION} (id: {{row[0]}})")
                else:
                    rel_id = f"rel-v{VERSION}-win"
                    cur.execute("INSERT INTO jacs_records (id, collection, data) VALUES (%s, 'releases', %s)", (rel_id, json.dumps(data)))
                    print(f"[{{name}}] Inserted new release {VERSION} (id: {{rel_id}})")
            conn.commit()
    except Exception as e:
        print(f"[{{name}}] Error: {{e}}")
"""

sftp = ssh.open_sftp()
with sftp.file("/tmp/update_db_release.py", "w") as f:
    f.write(db_script)
sftp.close()

stdin, stdout, stderr = ssh.exec_command("docker cp /tmp/update_db_release.py jacs-studio-prod-api-1:/tmp/update_db_release.py && docker exec jacs-studio-prod-api-1 python3 /tmp/update_db_release.py")
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print(f"Warning: {err}")

ssh.close()
print(f"\n🎉 HOÀN TẤT PHÁT HÀNH & DEPLOY JACS STUDIO v{VERSION}!")
