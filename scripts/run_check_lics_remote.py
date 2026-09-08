import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw', timeout=15)

remote_py = """
from app.core.store import store

licenses = store.list("licenses")
print("COUNT LICENSES:", len(licenses))
for lic in licenses:
    print("LIC:", lic.get("id"), lic.get("key"), lic.get("key_hint"), lic.get("customer_name"), lic.get("hwid"), lic.get("credit_balance"), lic.get("allowed_models"))
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/check_lics.py', 'w') as f:
    f.write(remote_py)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('docker cp /tmp/check_lics.py jacs-studio-prod-api-1:/tmp/check_lics.py && docker exec jacs-studio-prod-api-1 python /tmp/check_lics.py')
print("OUTPUT:")
print(stdout.read().decode('utf-8', errors='ignore'))
print("ERR:")
print(stderr.read().decode('utf-8', errors='ignore'))

ssh.close()
