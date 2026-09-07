import os
import sys
import io
import time
import hashlib
import urllib.request
import ssl
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

ROOT_DIR = r"d:\PROJECT\Client_Projects\02_Active_Projects_Php83\meridians-jacs-studio\meridians-jacs-studio"
APP_DIR = os.path.join(ROOT_DIR, "FE", "desktop-app")
RELEASE_DIR = os.path.join(APP_DIR, "release")
LOCAL_EXE = os.path.join(RELEASE_DIR, "JACS-Studio-Setup-v0.8.28.exe")

if not os.path.exists(LOCAL_EXE):
    print(f"Error: {LOCAL_EXE} not found")
    sys.exit(1)

ts = int(time.time())
VERSION = "0.8.28"
UNIQUE_EXE_NAME = f"JACS-Studio-Setup-v{VERSION}-{ts}.exe"
file_size = os.path.getsize(LOCAL_EXE)
with open(LOCAL_EXE, "rb") as f:
    sha512 = hashlib.sha512(f.read()).hexdigest()

DOWNLOAD_URL = f"https://jacs-studio.nexoratech.com.vn/downloads/{UNIQUE_EXE_NAME}"
RELEASE_NOTES = f"Bản cập nhật v{VERSION}: Tách biệt Bảng Nhà Cung Cấp BYOK và Danh Sách Model AI & Định Giá Cloud Admin, Sửa lỗi an toàn trang Phân Tích Video, Tối ưu hóa bảng Báo Cáo Hoạt Động API."

print(f"📦 Đang phát hành file setup mới: {UNIQUE_EXE_NAME}")
print(f"📊 Dung lượng: {file_size} bytes ({file_size / (1024*1024):.2f} MB)")
print(f"🔑 SHA-512: {sha512}")
print(f"🔗 URL tải: {DOWNLOAD_URL}")

SERVER = "221.121.1.3"
USER = "root"
PASS = r"4fT0R%GUJgh@a9Vw"
REMOTE_DIR = "/opt/jacs-studio/downloads"

print(f"\n📡 Kết nối tới server {SERVER}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, port=22, username=USER, password=PASS, timeout=20)
sftp = ssh.open_sftp()

print(f"⬆️ Đang tải {UNIQUE_EXE_NAME} lên server...")
sftp.put(LOCAL_EXE, f"{REMOTE_DIR}/{UNIQUE_EXE_NAME}")
sftp.put(LOCAL_EXE, f"{REMOTE_DIR}/JACS-Studio-Setup-v{VERSION}.exe")
sftp.put(LOCAL_EXE, f"{REMOTE_DIR}/JACS-Studio-latest-setup.exe")
sftp.put(LOCAL_EXE, f"{REMOTE_DIR}/jacs-studio-windows-setup.exe")
sftp.close()

# Cập nhật quyền
ssh.exec_command(f"chmod -R 755 {REMOTE_DIR}/*")

# Cập nhật DB
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
            'size', {file_size},
            'force_update', false,
            'mandatory', false,
            'release_notes', '{RELEASE_NOTES}'
        ),
        updated_at = NOW()
    WHERE collection = 'releases' AND (data->>'version' = 'v{VERSION}' OR data->>'version' = '{VERSION}') AND (data->>'platform' = 'windows' OR data->>'platform' = 'windows-x64');
END $$;
"""

print("\n💾 Cập nhật PostgreSQL...")
for container, user, db in [("jacs-studio-prod-postgres-1", "jacs_prod", "jacs_studio_prod"), ("jacs-studio-staging-postgres-1", "jacs_staging", "jacs_studio_staging")]:
    stdin, stdout, stderr = ssh.exec_command(f"docker exec -i {container} psql -U {user} -d {db}")
    stdin.write(sql)
    stdin.channel.shutdown_write()
    out = stdout.read().decode("utf-8", errors="ignore")
    err = stderr.read().decode("utf-8", errors="ignore")
    print(f"[{container}] Result: {out.strip()} {err.strip()}")

# Test API
stdin, stdout, stderr = ssh.exec_command("curl -s 'http://127.0.0.1:84/api/v1/releases/check?platform=windows&current_version=v0.8.27&channel=stable'")
print("Prod API Check Response:", stdout.read().decode("utf-8", errors="ignore"))
ssh.close()

# Test tải từ internet và kiểm tra SHA-512
print("\n🌐 Đang kiểm tra tải file từ Internet URL...")
ctx = ssl._create_unverified_context()
req = urllib.request.Request(DOWNLOAD_URL, headers={"User-Agent": "Mozilla/5.0"})
res = urllib.request.urlopen(req, context=ctx, timeout=30)
dl_data = res.read()
dl_sha512 = hashlib.sha512(dl_data).hexdigest()

print(f"Tải về thành công: {len(dl_data)} bytes")
print(f"SHA-512 từ URL:    {dl_sha512}")
print(f"SHA-512 gốc:       {sha512}")

if dl_sha512.lower() == sha512.lower() and len(dl_data) == file_size:
    print("\n🎉 XÁC THỰC HOÀN TOÀN TRÙNG KHỚP 100%! KHÁCH HÀNG CÓ THỂ CẬP NHẬT NGAY!")
else:
    print("\n❌ CẢNH BÁO: VẪN CÓ SỰ SAI LỆCH!")
