import os
import sys
import io
import hashlib
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

EXE_PATH = r"d:\PROJECT\Client_Projects\02_Active_Projects_Php83\meridians-jacs-studio\meridians-jacs-studio\FE\desktop-app\release\JACS-Studio-Setup-v0.8.28.exe"
file_size = os.path.getsize(EXE_PATH)
with open(EXE_PATH, "rb") as f:
    sha512 = hashlib.sha512(f.read()).hexdigest()

DOWNLOAD_URL = "https://jacs-studio.nexoratech.com.vn/downloads/JACS-Studio-Setup-v0.8.28.exe"
VERSION = "0.8.28"
RELEASE_NOTES = "Bản cập nhật v0.8.28: Tách biệt Bảng Nhà Cung Cấp BYOK và Danh Sách Model AI & Định Giá Cloud Admin, Sửa lỗi an toàn trang Phân Tích Video, Tối ưu hóa bảng Báo Cáo Hoạt Động API."

print(f"EXE Size: {file_size} bytes")
print(f"SHA-512: {sha512}")

SERVER = "221.121.1.3"
USER = "root"
PASS = r"4fT0R%GUJgh@a9Vw"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, port=22, username=USER, password=PASS, timeout=20)

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

for container, user, db in [("jacs-studio-prod-postgres-1", "jacs_prod", "jacs_studio_prod"), ("jacs-studio-staging-postgres-1", "jacs_staging", "jacs_studio_staging")]:
    stdin, stdout, stderr = ssh.exec_command(f"docker exec -i {container} psql -U {user} -d {db}")
    stdin.write(sql)
    stdin.channel.shutdown_write()
    out = stdout.read().decode("utf-8", errors="ignore")
    err = stderr.read().decode("utf-8", errors="ignore")
    print(f"[{container}] Result: {out.strip()} {err.strip()}")

stdin, stdout, stderr = ssh.exec_command("curl -s 'http://127.0.0.1:84/api/v1/releases/check?platform=windows&current_version=v0.8.27&channel=stable'")
print("Prod API Check Response:", stdout.read().decode("utf-8", errors="ignore"))

ssh.close()
