import time
import os
import sys
import zipfile
import hashlib
import paramiko

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RELEASE_DIR = os.path.join(ROOT_DIR, "release")
ASAR_PATH = os.path.join(RELEASE_DIR, "app.asar")
VERSION = "0.8.17"
TIMESTAMP = int(time.time())
ZIP_NAME = f"jacs-studio-v{VERSION}-update-{TIMESTAMP}.zip"
GENERIC_ZIP_NAME = f"jacs-studio-v{VERSION}-update.zip"
ZIP_PATH = os.path.join(RELEASE_DIR, ZIP_NAME)
GENERIC_ZIP_PATH = os.path.join(RELEASE_DIR, GENERIC_ZIP_NAME)

if not os.path.exists(ASAR_PATH):
    print("app.asar not found! Run pack-asar.cjs first.")
    sys.exit(1)

# 1. Create update zip with structure: resources/app.asar
print(f"Creating {ZIP_NAME}...")
with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(ASAR_PATH, "resources/app.asar")

with zipfile.ZipFile(GENERIC_ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(ASAR_PATH, "resources/app.asar")

# 2. Compute SHA-512 & size
file_size = os.path.getsize(ZIP_PATH)
with open(ZIP_PATH, "rb") as f:
    sha512 = hashlib.sha512(f.read()).hexdigest()

print(f"Zip created: {file_size / 1024 / 1024:.2f} MB")
print(f"SHA-512: {sha512}")

# 3. Connect to remote server
SERVER = "221.121.1.3"
USER = "root"
PASS = "4fT0R%GUJgh@a9Vw"
REMOTE_DIR = "/opt/jacs-studio/downloads"
DOWNLOAD_URL = f"https://jacs-studio.nexoratech.com.vn/downloads/{ZIP_NAME}"

print(f"Connecting to {SERVER} via SSH...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, port=22, username=USER, password=PASS)

# Upload via SFTP
sftp = ssh.open_sftp()
remote_zip_path = f"{REMOTE_DIR}/{ZIP_NAME}"
remote_generic_path = f"{REMOTE_DIR}/{GENERIC_ZIP_NAME}"
print(f"Uploading {ZIP_NAME} ({file_size / 1024 / 1024:.2f} MB) to {remote_zip_path}...")
sftp.put(ZIP_PATH, remote_zip_path)
print(f"Uploading {GENERIC_ZIP_NAME} to {remote_generic_path}...")
sftp.put(GENERIC_ZIP_PATH, remote_generic_path)

# If full Windows package exists, also upload it
FULL_WIN_ZIP = os.path.join(RELEASE_DIR, f"JACS Studio-{VERSION}-win.zip")
if os.path.exists(FULL_WIN_ZIP):
    full_size = os.path.getsize(FULL_WIN_ZIP)
    remote_full_1 = f"{REMOTE_DIR}/jacs-studio-v{VERSION}-windows.zip"
    remote_full_2 = f"{REMOTE_DIR}/jacs-studio-windows-latest.zip"
    remote_full_3 = f"{REMOTE_DIR}/JACS-Studio-latest-win-x64.zip"
    print(f"Uploading full standalone Windows package ({full_size / 1024 / 1024:.2f} MB)...")
    sftp.put(FULL_WIN_ZIP, remote_full_1)
    sftp.put(FULL_WIN_ZIP, remote_full_2)
    sftp.put(FULL_WIN_ZIP, remote_full_3)
    print("Full standalone packages uploaded successfully!")

sftp.close()

# Also ensure remote /downloads permissions
ssh.exec_command(f"chmod -R 644 {REMOTE_DIR}/*")

# 4. Insert or update Postgres database in prod & staging
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
                'release_notes', 'Bản cập nhật v0.8.17: Nâng cấp chuẩn Master Storyteller kịch bản 3 Hồi & Hook cao trào 10s, văn phong Cops Bodycam & Quan sát Xã hội kịch tính, tối ưu hóa tỷ lệ giữ chân người xem (Retention).'
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
                'release_notes', 'Bản cập nhật v0.8.17: Nâng cấp chuẩn Master Storyteller kịch bản 3 Hồi & Hook cao trào 10s, văn phong Cops Bodycam & Quan sát Xã hội kịch tính, tối ưu hóa tỷ lệ giữ chân người xem (Retention).'
            ),
            NOW(),
            NOW()
        );
    END IF;
END $$;
"""

print("Updating Postgres database records on server...")
for container, user, db in [("jacs-studio-prod-postgres-1", "jacs_prod", "jacs_studio_prod"), ("jacs-studio-staging-postgres-1", "jacs_staging", "jacs_studio_staging")]:
    stdin, stdout, stderr = ssh.exec_command(f"docker exec -i {container} psql -U {user} -d {db}")
    stdin.write(sql)
    stdin.channel.shutdown_write()
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"[{container}] output: {out.strip()} {err.strip()}")

ssh.close()
print(f"Deployment of v{VERSION} to server completed successfully!")
