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

VERSION = "0.8.36"
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

# 4. Upload Backend & Web Admin files
print("\n🔄 Đang cập nhật Backend và Admin Portal lên Docker trên Server...")
remote_be = "/tmp/be_update.tar.gz"
os.makedirs(os.path.join(ROOT_DIR, "scratch"), exist_ok=True)
local_be_tar = os.path.join(ROOT_DIR, "scratch", "be_update.tar.gz")
subprocess.check_call(f'tar -czf "{local_be_tar}" -C "{BE_DIR}" app', shell=True)
sftp.put(local_be_tar, remote_be)

# Deploy to API container
ssh.exec_command(f"tar -xzf {remote_be} -C /opt/jacs-studio/api/")
ssh.exec_command("docker cp /tmp/be_update.tar.gz jacs-studio-prod-api-1:/tmp/")
stdin, stdout, stderr = ssh.exec_command("docker exec jacs-studio-prod-api-1 tar -xzf /tmp/be_update.tar.gz -C /app/")
stdout.channel.recv_exit_status()
ssh.exec_command("docker restart jacs-studio-prod-api-1")
print("✅ Đã cập nhật và restart jacs-studio-prod-api-1")

# Build & Deploy Admin Portal
print("🔨 Đang build Admin Portal...")
cmd_admin = f'cmd /c "npm.cmd --prefix \"{ADMIN_DIR}\" run build"'
subprocess.check_call(cmd_admin, shell=True)

remote_web = "/tmp/web_update.tar.gz"
local_web_tar = os.path.join(ROOT_DIR, "scratch", "web_update.tar.gz")
subprocess.check_call(f'tar -czf "{local_web_tar}" -C "{ADMIN_DIR}/dist" .', shell=True)
sftp.put(local_web_tar, remote_web)

ssh.exec_command(f"mkdir -p /opt/jacs-studio/web/dist && tar -xzf {remote_web} -C /opt/jacs-studio/web/dist/")
ssh.exec_command("docker cp /tmp/web_update.tar.gz jacs-studio-prod-web-1:/tmp/")
stdin, stdout, stderr = ssh.exec_command("docker exec jacs-studio-prod-web-1 sh -c 'mkdir -p /usr/share/nginx/html && tar -xzf /tmp/web_update.tar.gz -C /usr/share/nginx/html/'")
stdout.channel.recv_exit_status()
ssh.exec_command("docker restart jacs-studio-prod-web-1")
print("✅ Đã cập nhật và restart jacs-studio-prod-web-1")

# 5. Upload OTA files
REMOTE_DOWNLOADS = "/opt/jacs-studio/downloads"
ssh.exec_command(f"mkdir -p {REMOTE_DOWNLOADS}")
print(f"⬆️ Đang upload OTA {ZIP_NAME}...")
sftp.put(ZIP_PATH, f"{REMOTE_DOWNLOADS}/{ZIP_NAME}")
sftp.put(GENERIC_ZIP_PATH, f"{REMOTE_DOWNLOADS}/{GENERIC_ZIP_NAME}")
sftp.put(QUICK_PATCH_PATH, f"{REMOTE_DOWNLOADS}/{QUICK_PATCH_NAME}")
print("✅ Đã upload toàn bộ OTA files lên server")

# 6. Update PostgreSQL Releases Table
print("\n📝 Đang cập nhật cơ sở dữ liệu Releases trên Server...")
notes = f"Phiên bản {VERSION}: Nâng cấp độ chính xác phân tích AI video toàn diện mọi thể loại (phim, vlog, đời sống, tin tức...), tăng độ phân giải 640p keyframe, chuẩn hóa JSON output."
safe_notes = notes.replace("'", "''")

sql_update = f"""
docker exec jacs-studio-prod-postgres-1 psql -U postgres -d jacs_admin -c "
DELETE FROM jacs_records WHERE collection = 'releases' AND (id = 'rel-{VERSION}' OR id = 'releases-v{VERSION}' OR id = '{VERSION}');
INSERT INTO jacs_records (collection, id, data, created_at, updated_at)
VALUES (
    'releases',
    'rel-{VERSION}',
    '{{"id": "rel-{VERSION}", "version": "{VERSION}", "channel": "stable", "platform": "windows", "download_url": "{DOWNLOAD_URL}", "file_name": "{ZIP_NAME}", "file_size": {file_size}, "sha512": "{sha512}", "is_mandatory": false, "notes": "{safe_notes}", "release_notes": "{safe_notes}", "is_published": true, "published_at": "{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}", "created_at": "{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}"}}'::jsonb,
    NOW(),
    NOW()
);
UPDATE jacs_records SET data = jsonb_set(data, '{{is_published}}', 'false'::jsonb) WHERE collection = 'releases' AND id != 'rel-{VERSION}';
"
"""

stdin, stdout, stderr = ssh.exec_command(sql_update)
out = stdout.read().decode('utf-8', errors='ignore')
err = stderr.read().decode('utf-8', errors='ignore')
print(f"Database update result:\n{out}")
if err:
    print(f"Warnings/Errors: {err}")

sftp.close()
ssh.close()
print(f"\n🎉 HOÀN TẤT TRIỂN KHAI PHIÊN BẢN v{VERSION} THÀNH CÔNG RỰC RỠ!")
