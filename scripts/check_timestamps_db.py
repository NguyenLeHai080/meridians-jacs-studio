import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw', timeout=15)

py_code = """
from app.core.store import store
import json

logs = list(store.list("ai_gateway_logs"))
print("Sample ai_gateway_logs timestamps:")
for l in logs[:10]:
    print("Log ID:", l.get("id"), "| timestamp:", repr(l.get("timestamp")), "| created_at:", repr(l.get("created_at")))

jobs = list(store.list("jobs"))
print("Sample jobs timestamps:")
for j in jobs[:5]:
    print("Job ID:", j.get("id"), "| createdAt:", repr(j.get("createdAt")), "| created_at:", repr(j.get("created_at")))
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/check_timestamps.py', 'w') as f:
    f.write(py_code)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('docker cp /tmp/check_timestamps.py jacs-studio-prod-api-1:/tmp/check_timestamps.py && docker exec jacs-studio-prod-api-1 python3 /tmp/check_timestamps.py')
out = stdout.read().decode('utf-8', errors='ignore')
print(out.encode('ascii', errors='ignore').decode('ascii'))
ssh.close()
