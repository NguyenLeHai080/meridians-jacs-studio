import os
import sys
import io
import time
import shutil
import zipfile
import hashlib
import subprocess
import urllib.request
import ssl
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

ROOT_DIR = r"d:\PROJECT\Client_Projects\02_Active_Projects_Php83\meridians-jacs-studio\meridians-jacs-studio"
APP_DIR = os.path.join(ROOT_DIR, "FE", "desktop-app")
DIST_DIR = os.path.join(APP_DIR, "dist")
ELECTRON_DIR = os.path.join(APP_DIR, "electron")
RELEASE_DIR = os.path.join(APP_DIR, "release")
ASAR_PATH = os.path.join(RELEASE_DIR, "app.asar")
PACKAGE_JSON = os.path.join(APP_DIR, "package.json")

print("1. Đóng gói app.asar mới nhất từ dist & electron...")
temp_pack_dir = os.path.join(RELEASE_DIR, "temp_app_pack")
shutil.rmtree(temp_pack_dir, ignore_errors=True)
os.makedirs(temp_pack_dir, exist_ok=True)

shutil.copytree(DIST_DIR, os.path.join(temp_pack_dir, "dist"))
shutil.copytree(ELECTRON_DIR, os.path.join(temp_pack_dir, "electron"))
shutil.copyfile(PACKAGE_JSON, os.path.join(temp_pack_dir, "package.json"))

# Dùng npx asar pack
npx_asar = "npx.cmd" if os.name == "nt" else "npx"
res = subprocess.run([npx_asar, "asar", "pack", temp_pack_dir, ASAR_PATH], capture_output=True, text=True, shell=True)
if res.returncode != 0:
    print("Lỗi khi pack asar:", res.stderr)
    sys.exit(1)

shutil.rmtree(temp_pack_dir, ignore_errors=True)
asar_size = os.path.getsize(ASAR_PATH)
print(f"✅ Đã đóng gói app.asar thành công: {asar_size / (1024*1024):.2f} MB ({asar_size} bytes)")

# 2. Tạo file ZIP OTA cập nhật với timestamp độc nhất
ts = int(time.time())
VERSION = "0.8.28"
ZIP_NAME = f"jacs-studio-v{VERSION}-ota-{ts}.zip"
ZIP_PATH = os.path.join(RELEASE_DIR, ZIP_NAME)

print(f"\n2. Tạo file ZIP OTA {ZIP_NAME}...")
with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(ASAR_PATH, "resources/app.asar")
    zf.write(ASAR_PATH, "app.asar")

zip_size = os.path.getsize(ZIP_PATH)
with open(ZIP_PATH, "rb") as f:
    sha512 = hashlib.sha512(f.read()).hexdigest()

DOWNLOAD_URL = f"https://jacs-studio.nexoratech.com.vn/downloads/{ZIP_NAME}"
RELEASE_NOTES = f"Bản cập nhật v{VERSION}: Tách biệt Bảng Nhà Cung Cấp BYOK và Danh Sách Model AI & Định Giá Cloud Admin, Sửa lỗi an toàn trang Phân Tích Video, Tối ưu hóa bảng Báo Cáo Hoạt Động API."

print(f"✅ File ZIP đã tạo xong:")
print(f"   Dung lượng: {zip_size} bytes ({zip_size / (1024*1024):.2f} MB)")
print(f"   SHA-512:    {sha512}")
print(f"   URL:        {DOWNLOAD_URL}")

# 3. Upload lên Server qua SSH/SFTP
SERVER = "221.121.1.3"
USER = "root"
PASS = r"4fT0R%GUJgh@a9Vw"
REMOTE_DIR = "/opt/jacs-studio/downloads"

print(f"\n3. Kết nối tới server {SERVER}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, port=22, username=USER, password=PASS, timeout=20)
sftp = ssh.open_sftp()

print(f"⬆️ Đang tải {ZIP_NAME} lên server...")
sftp.put(ZIP_PATH, f"{REMOTE_DIR}/{ZIP_NAME}")
sftp.put(ZIP_PATH, f"{REMOTE_DIR}/jacs-studio-v{VERSION}-update.zip")
sftp.put(ZIP_PATH, f"{REMOTE_DIR}/JACS-Studio-Latest-Quick-Patch.zip")
sftp.close()

# Cấp quyền
ssh.exec_command(f"chmod -R 755 {REMOTE_DIR}/*")

# 4. Cập nhật PostgreSQL
sql = f"""
DO $$
BEGIN
    UPDATE jacs_records 
    SET data = jsonb_build_object(
            'version', 'v{VERSION}',
            'channel', 'stable',
            'platform', 'windows',
            'status', 'published',
            'download_url', '{DOWNLOAD_URL}',
            'url', '{DOWNLOAD_URL}',
            'sha512', '{sha512}',
            'size', {zip_size},
            'force_update', false,
            'mandatory', false,
            'release_notes', '{RELEASE_NOTES}'
        ),
        updated_at = NOW()
    WHERE collection = 'releases' AND (data->>'version' = 'v{VERSION}' OR data->>'version' = '{VERSION}') AND (data->>'platform' = 'windows' OR data->>'platform' = 'windows-x64');
END $$;
"""

print("\n4. Cập nhật cơ sở dữ liệu PostgreSQL...")
for container, user, db in [("jacs-studio-prod-postgres-1", "jacs_prod", "jacs_studio_prod"), ("jacs-studio-staging-postgres-1", "jacs_staging", "jacs_studio_staging")]:
    stdin, stdout, stderr = ssh.exec_command(f"docker exec -i {container} psql -U {user} -d {db}")
    stdin.write(sql)
    stdin.channel.shutdown_write()
    out = stdout.read().decode("utf-8", errors="ignore")
    err = stderr.read().decode("utf-8", errors="ignore")
    print(f"[{container}] Result: {out.strip()} {err.strip()}")

# Test API Check
stdin, stdout, stderr = ssh.exec_command("curl -s 'http://127.0.0.1:84/api/v1/releases/check?platform=windows&current_version=v0.8.27&channel=stable'")
print("\n🔍 Phản hồi API Server:", stdout.read().decode("utf-8", errors="ignore"))
ssh.close()

# 5. Tải từ internet và xác thực SHA-512
print("\n5. Kiểm tra tải từ Internet URL và xác thực SHA-512...")
ctx = ssl._create_unverified_context()
req = urllib.request.Request(DOWNLOAD_URL, headers={"User-Agent": "Mozilla/5.0"})
res = urllib.request.urlopen(req, context=ctx, timeout=30)
dl_data = res.read()
dl_sha512 = hashlib.sha512(dl_data).hexdigest()

print(f"   Dung lượng tải về: {len(dl_data)} bytes")
print(f"   SHA-512 tải về:    {dl_sha512}")
print(f"   SHA-512 gốc:       {sha512}")

if dl_sha512.lower() == sha512.lower() and len(dl_data) == zip_size:
    print("\n🎉 XÁC THỰC THÀNH CÔNG 100%! GÓI CẬP NHẬT OTA ĐÃ SẴN SÀNG CHO MÁY KHÁCH!")
else:
    print("\n❌ LỖI: SHA-512 KHÔNG KHỚP!")
