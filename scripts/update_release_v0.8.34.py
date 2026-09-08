import paramiko
import sys
import json
from datetime import datetime, UTC

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw')

data = {
    "version": "0.8.34",
    "platform": "windows",
    "channel": "stable",
    "download_url": "https://jacs-studio.nexoratech.com.vn/downloads/jacs-studio-v0.8.34-update.zip",
    "sha512": "01ab6bc7e0ed0f82741c1288ff203e80ca1badc3d17aebe939b6e601d114b719d3d1529ef5bf8f75d0e07daef44c365a5ef8d3890bc5d871fe3f68911271c05b",
    "file_size": 3659821,
    "notes": "Bản phát hành v0.8.34: Giám sát toàn diện 100% lượt gọi AI request & đo độ trễ thời gian thực cho Desktop Tool.",
    "is_mandatory": True,
    "published_at": datetime.now(UTC).isoformat()
}

json_str = json.dumps(data).replace("'", "''")

sql = f"""
DELETE FROM jacs_records WHERE collection='releases' AND (id='rel-v0.8.34-win' OR data->>'version'='0.8.34');
INSERT INTO jacs_records (id, collection, data) 
VALUES ('rel-v0.8.34-win', 'releases', '{json_str}'::jsonb);
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
print("✅ Đã cập nhật PostgreSQL releases v0.8.34!")
