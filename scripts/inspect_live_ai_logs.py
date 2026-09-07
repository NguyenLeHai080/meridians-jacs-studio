import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw', timeout=15)

py_code = """
from app.core.store import store
import json

logs = list(store.list("ai_gateway_logs"))
print("Total logs:", len(logs))
for i, l in enumerate(logs[:10]):
    print(f"Log #{i+1}:", json.dumps(l, default=str, ensure_ascii=False))
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/view_ai_logs.py', 'w') as f:
    f.write(py_code)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('docker cp /tmp/view_ai_logs.py jacs-studio-prod-api-1:/tmp/view_ai_logs.py && docker exec jacs-studio-prod-api-1 python3 /tmp/view_ai_logs.py')
out = stdout.read().decode('utf-8', errors='ignore')
print(out.encode('ascii', errors='ignore').decode('ascii'))
print(stderr.read().decode('utf-8', errors='ignore'))
ssh.close()
