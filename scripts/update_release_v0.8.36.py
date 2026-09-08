import paramiko
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', port=22, username='root', password=r'4fT0R%GUJgh@a9Vw')

VERSION = "0.8.36"
DOWNLOAD_URL = "https://jacs-studio.nexoratech.com.vn/downloads/jacs-studio-v0.8.36-update-1788755382.zip"
file_size = 3664140
sha512 = "4094444c372201b5c12ca61de64d25fd38cf04f2b13ca900cf2b0e8a9e356a73a458635d803cd0d8d2ec897f3407ace44cff483ab91c8e24d6b7e9aad83736a8"
release_notes = "Phiên bản 0.8.36: Nâng cấp độ chính xác phân tích AI video toàn diện mọi thể loại, tăng độ phân giải 640p keyframe, chuẩn hóa JSON output."

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
    "notes": "{release_notes}",
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
print("Cập nhật database release thành công!")
