import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw', timeout=15)

py_code = """
from app.core.store import store
from datetime import datetime, UTC
import json

logs = list(store.list("ai_gateway_logs"))
print("Total logs:", len(logs))
recent_logs = sorted(logs, key=lambda x: str(x.get("timestamp") or ""), reverse=True)[:10]
for l in recent_logs:
    print(l.get("id"), "| timestamp:", l.get("timestamp"), "| model:", l.get("model"))
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/check_recent_logs.py', 'w') as f:
    f.write(py_code)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('docker cp /tmp/check_recent_logs.py jacs-studio-prod-api-1:/tmp/check_recent_logs.py && docker exec jacs-studio-prod-api-1 python3 /tmp/check_recent_logs.py')
out = stdout.read().decode('utf-8', errors='ignore')
print(out.encode('ascii', errors='ignore').decode('ascii'))
ssh.close()
