import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw', timeout=15)

py_code = """
from app.core.store import store
import json

licenses = list(store.list("licenses"))
print("Total licenses in DB:", len(licenses))
for l in licenses:
    print("License:", l.get("customer_name"), "| Key:", l.get("key_hint"), "| Credit:", l.get("credit_balance"), "| Allowed Models:", l.get("allowed_models"), "| Gateway Enabled:", l.get("ai_gateway_enabled"))
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/test_grants.py', 'w') as f:
    f.write(py_code)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('docker cp /tmp/test_grants.py jacs-studio-prod-api-1:/tmp/test_grants.py && docker exec jacs-studio-prod-api-1 python3 /tmp/test_grants.py')
out = stdout.read().decode('utf-8', errors='ignore')
print(out.encode('ascii', errors='ignore').decode('ascii'))
ssh.close()
