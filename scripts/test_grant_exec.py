import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw', timeout=15)

py_code = """
from app.core.store import store
import json
from uuid import UUID

licenses = list(store.list("licenses"))
if licenses:
    target = licenses[0]
    lid = UUID(str(target["id"]))
    print("Testing update for:", target.get("customer_name"), target["id"])
    
    # Set credit to 500.00 Cr
    updated = store.update("licenses", lid, {
        "credit_balance": 500.0,
        "allowed_models": ["gemini-2.5-flash", "gpt-5.6-sol", "claude-3-7-sonnet", "deepseek-chat"],
        "ai_gateway_enabled": True
    })
    print("Updated License:", updated.get("customer_name"), "| Credit:", updated.get("credit_balance"), "| Models:", updated.get("allowed_models"))
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/test_grant_exec.py', 'w') as f:
    f.write(py_code)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('docker cp /tmp/test_grant_exec.py jacs-studio-prod-api-1:/tmp/test_grant_exec.py && docker exec jacs-studio-prod-api-1 python3 /tmp/test_grant_exec.py')
out = stdout.read().decode('utf-8', errors='ignore')
print(out.encode('ascii', errors='ignore').decode('ascii'))
ssh.close()
