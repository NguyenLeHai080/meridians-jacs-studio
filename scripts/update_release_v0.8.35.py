import paramiko
import sys
import json
import hashlib
import os
from datetime import datetime, UTC

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = r"d:\PROJECT\Client_Projects\meridians-jacs-studio"
RELEASE_DIR = os.path.join(ROOT_DIR, "FE", "desktop-app", "release")
GENERIC_ZIP_PATH = os.path.join(RELEASE_DIR, "jacs-studio-v0.8.35-update.zip")

with open(GENERIC_ZIP_PATH, "rb") as f:
    content = f.read()
    sha512 = hashlib.sha512(content).hexdigest()
    file_size = len(content)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw')

data = {
    "version": "0.8.35",
    "platform": "windows",
    "channel": "stable",
    "status": "published",
    "download_url": "https://jacs-studio.nexoratech.com.vn/downloads/jacs-studio-v0.8.35-update.zip",
    "sha512": sha512,
    "file_size": file_size,
    "notes": "Bản phát hành v0.8.35: Nạp Credit tự động 100% qua SePay Webhook, loại bỏ xác nhận thủ công, tối ưu giao diện và giám sát realtime.",
    "is_mandatory": True,
    "is_published": True,
    "published_at": datetime.now(UTC).isoformat()
}

json_str = json.dumps(data).replace("'", "''")

sql = f"""
DELETE FROM jacs_records WHERE collection='releases' AND (id='rel-v0.8.35-win' OR data->>'version'='0.8.35');
INSERT INTO jacs_records (id, collection, data) 
VALUES ('rel-v0.8.35-win', 'releases', '{json_str}'::jsonb);
"""

cmd = f"""docker exec -i jacs-studio-prod-postgres-1 psql -U jacs_prod -d jacs_studio_prod << 'EOF'
{sql}
EOF
docker exec -i jacs-studio-staging-postgres-1 psql -U jacs_staging -d jacs_studio_staging << 'EOF'
{sql}
EOF
"""

stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

ssh.close()
print(f"✅ Đã cập nhật PostgreSQL releases v0.8.35 (sha512: {sha512[:16]}..., size: {file_size})!")
