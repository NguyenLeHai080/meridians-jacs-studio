import time
import os
import sys
import io
import zipfile
import hashlib
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

ROOT_DIR = r"d:\PROJECT\Client_Projects\02_Active_Projects_Php83\meridians-jacs-studio\meridians-jacs-studio"
APP_DIR = os.path.join(ROOT_DIR, "FE", "desktop-app")
RELEASE_DIR = os.path.join(APP_DIR, "release")
ASAR_PATH = os.path.join(RELEASE_DIR, "app.asar")

VERSION = "0.8.26"
TIMESTAMP = int(time.time())

EXE_NAME = f"JACS-Studio-Setup-v{VERSION}.exe"
EXE_PATH = os.path.join(RELEASE_DIR, EXE_NAME)

PORTABLE_ZIP_NAME = f"JACS-Studio-v{VERSION}-Portable-win-x64.zip"
PORTABLE_ZIP_PATH = os.path.join(RELEASE_DIR, PORTABLE_ZIP_NAME)

ZIP_NAME = f"jacs-studio-v{VERSION}-update-{TIMESTAMP}.zip"
GENERIC_ZIP_NAME = f"jacs-studio-v{VERSION}-update.zip"
QUICK_PATCH_NAME = "JACS-Studio-Latest-Quick-Patch.zip"

ZIP_PATH = os.path.join(RELEASE_DIR, ZIP_NAME)
GENERIC_ZIP_PATH = os.path.join(RELEASE_DIR, GENERIC_ZIP_NAME)
QUICK_PATCH_PATH = os.path.join(RELEASE_DIR, QUICK_PATCH_NAME)

if not os.path.exists(ASAR_PATH):
    print(f"Error: {ASAR_PATH} not found!")
    sys.exit(1)

# 1. Tạo các file ZIP update
print(f"📦 Đang tạo {ZIP_NAME}...")
with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(ASAR_PATH, "resources/app.asar")

with zipfile.ZipFile(GENERIC_ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(ASAR_PATH, "resources/app.asar")

with zipfile.ZipFile(QUICK_PATCH_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(ASAR_PATH, "resources/app.asar")

file_size = os.path.getsize(ZIP_PATH)
with open(ZIP_PATH, "rb") as f:
    sha512 = hashlib.sha512(f.read()).hexdigest()

DOWNLOAD_URL = f"https://jacs-studio.nexoratech.com.vn/downloads/{ZIP_NAME}"
print(f"✅ Gói cập nhật OTA đã sẵn sàng ({file_size / (1024*1024):.2f} MB)")
print(f"🔑 SHA-512: {sha512}")
print(f"🔗 Download URL: {DOWNLOAD_URL}")

# 2. Kết nối tới server qua SSH & SFTP
SERVER = "221.121.1.3"
USER = "root"
PASS = r"4fT0R%GUJgh@a9Vw"
REMOTE_DIR = "/opt/jacs-studio/downloads"

print(f"\n📡 Đang kết nối tới server {SERVER} qua SSH/SFTP...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, port=22, username=USER, password=PASS, timeout=15)
sftp = ssh.open_sftp()

if os.path.exists(EXE_PATH):
    print(f"⬆️ Đang tải {EXE_NAME} lên {REMOTE_DIR}/{EXE_NAME}...")
    sftp.put(EXE_PATH, f"{REMOTE_DIR}/{EXE_NAME}")
    sftp.put(EXE_PATH, f"{REMOTE_DIR}/JACS-Studio-latest-setup.exe")
    sftp.put(EXE_PATH, f"{REMOTE_DIR}/jacs-studio-windows-setup.exe")

if os.path.exists(PORTABLE_ZIP_PATH):
    print(f"⬆️ Đang tải {PORTABLE_ZIP_NAME} lên {REMOTE_DIR}/{PORTABLE_ZIP_NAME}...")
    sftp.put(PORTABLE_ZIP_PATH, f"{REMOTE_DIR}/{PORTABLE_ZIP_NAME}")

print(f"⬆️ Đang tải {ZIP_NAME} lên {REMOTE_DIR}/{ZIP_NAME}...")
sftp.put(ZIP_PATH, f"{REMOTE_DIR}/{ZIP_NAME}")

print(f"⬆️ Đang tải {GENERIC_ZIP_NAME} lên {REMOTE_DIR}/{GENERIC_ZIP_NAME}...")
sftp.put(GENERIC_ZIP_PATH, f"{REMOTE_DIR}/{GENERIC_ZIP_NAME}")

print(f"⬆️ Đang tải {QUICK_PATCH_NAME} lên {REMOTE_DIR}/{QUICK_PATCH_NAME}...")
sftp.put(QUICK_PATCH_PATH, f"{REMOTE_DIR}/{QUICK_PATCH_NAME}")

# Also update the standalone windows zip on server by replacing resources/app.asar inside it
print("\n🔄 Đang cập nhật standalone bundle trên server...")
update_bundle_cmd = f"""
python3 -c "
import zipfile, os, shutil

base_zip = '{REMOTE_DIR}/jacs-studio-windows-latest.zip'
out_zip = '{REMOTE_DIR}/jacs-studio-v{VERSION}-windows.zip'

if os.path.exists(base_zip) and os.path.exists('{REMOTE_DIR}/{ZIP_NAME}'):
    print('Updating base zip...')
    temp_dir = '/tmp/jacs_bundle_extract'
    shutil.rmtree(temp_dir, ignore_errors=True)
    os.makedirs(temp_dir, exist_ok=True)
    with zipfile.ZipFile(base_zip, 'r') as zf:
        zf.extractall(temp_dir)
    with zipfile.ZipFile('{REMOTE_DIR}/{ZIP_NAME}', 'r') as uzf:
        uzf.extractall(temp_dir)
    shutil.make_archive('/tmp/jacs_win_bundle', 'zip', temp_dir)
    shutil.move('/tmp/jacs_win_bundle.zip', out_zip)
    shutil.copyfile(out_zip, base_zip)
    shutil.copyfile(out_zip, '{REMOTE_DIR}/JACS-Studio-latest-win-x64.zip')
    shutil.rmtree(temp_dir, ignore_errors=True)
    print('Standalone Windows bundle updated to v{VERSION} successfully!')
"
"""

stdin, stdout, stderr = ssh.exec_command(update_bundle_cmd)
print(stdout.read().decode('utf-8', errors='ignore'))
err = stderr.read().decode('utf-8', errors='ignore')
if err:
    print(f"Notice: {err}")

# Set permissions
ssh.exec_command(f"chmod -R 755 {REMOTE_DIR}/*")

# 3. Publish release to PostgreSQL database in prod & staging
RELEASE_NOTES = f"Bản cập nhật v{VERSION}: Phân tích video hàng loạt theo Dải thời lượng đầu vào (Min-Max) linh hoạt & Chế độ Multi-Model AI Pool đa luồng luân chuyển tự động cắm đêm chống lỗi 429 Rate Limit."

sql = f"""
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM jacs_records WHERE collection = 'releases' AND (data->>'version' = 'v{VERSION}' OR data->>'version' = '{VERSION}') AND (data->>'platform' = 'windows' OR data->>'platform' = 'windows-x64')) THEN
        UPDATE jacs_records 
        SET data = jsonb_build_object(
                'version', 'v{VERSION}',
                'channel', 'stable',
                'platform', 'windows',
                'status', 'published',
                'download_url', '{DOWNLOAD_URL}',
                'url', '{DOWNLOAD_URL}',
                'sha512', '{sha512}',
                'size', {file_size},
                'force_update', false,
                'mandatory', false,
                'release_notes', '{RELEASE_NOTES}'
            ),
            updated_at = NOW()
        WHERE collection = 'releases' AND (data->>'version' = 'v{VERSION}' OR data->>'version' = '{VERSION}') AND (data->>'platform' = 'windows' OR data->>'platform' = 'windows-x64');
    ELSE
        INSERT INTO jacs_records (collection, id, data, created_at, updated_at)
        VALUES (
            'releases',
            gen_random_uuid(),
            jsonb_build_object(
                'version', 'v{VERSION}',
                'channel', 'stable',
                'platform', 'windows',
                'status', 'published',
                'download_url', '{DOWNLOAD_URL}',
                'url', '{DOWNLOAD_URL}',
                'sha512', '{sha512}',
                'size', {file_size},
                'force_update', false,
                'mandatory', false,
                'release_notes', '{RELEASE_NOTES}'
            ),
            NOW(),
            NOW()
        );
    END IF;
END $$;
"""

print("\n💾 Đang cập nhật cơ sở dữ liệu PostgreSQL (Production & Staging)...")
for container, user, db in [("jacs-studio-prod-postgres-1", "jacs_prod", "jacs_studio_prod"), ("jacs-studio-staging-postgres-1", "jacs_staging", "jacs_studio_staging")]:
    stdin, stdout, stderr = ssh.exec_command(f"docker exec -i {container} psql -U {user} -d {db}")
    stdin.write(sql)
    stdin.channel.shutdown_write()
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    print(f"[{container}] Kết quả: {out.strip()} {err.strip()}")

# 4. Kiểm tra endpoint API cập nhật
print("\n🔍 Kiểm tra phản hồi từ API Server (Check update API cho v0.8.25)...")
stdin, stdout, stderr = ssh.exec_command("curl -s 'http://127.0.0.1:84/api/v1/releases/check?platform=windows&current_version=v0.8.25&channel=stable'")
print("Prod API Response:", stdout.read().decode('utf-8', errors='ignore'))

sftp.close()
ssh.close()
print(f"\n🎉 XUẤT BẢN THÀNH CÔNG PHIÊN BẢN v{VERSION} CHO KHÁCH HÀNG!")
