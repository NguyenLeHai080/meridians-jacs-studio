import paramiko
import json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw', timeout=15)

script = '''
from app.core.store import store
import json

licenses = store.list("licenses")
print("COUNT:", len(licenses))
for lic in licenses:
    print(f"ID={lic.get('id')} KEY={lic.get('key')} KEY_HINT={lic.get('key_hint')} HWID={lic.get('hwid')} NAME={lic.get('customer_name')} BALANCE={lic.get('credit_balance')} MODELS={lic.get('allowed_models')}")
'''

cmd = f"docker exec jacs-studio-prod-api-1 python -c {json.dumps(script)}"
stdin, stdout, stderr = ssh.exec_command(cmd)
print("APP LICENSES FROM STORE:")
print(stdout.read().decode('utf-8', errors='ignore'))
print("ERR:", stderr.read().decode('utf-8', errors='ignore'))

ssh.close()
