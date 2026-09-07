import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw', timeout=15)

py_code = """
import urllib.request, json
from app.core.security import issue_token

tok_res = issue_token({"id": "usr-admin", "sub": "admin", "role": "admin", "email": "admin@jacs-studio.vn"})
tok = tok_res[0] if isinstance(tok_res, tuple) else tok_res
req2 = urllib.request.Request('http://127.0.0.1:8000/api/v1/telemetry/global-requests?limit=5', headers={'Authorization': 'Bearer ' + tok})
res2 = urllib.request.urlopen(req2)
data = json.loads(res2.read().decode())
print('SERVER VERIFIED! Total logs:', data['data']['total'])
print('Summary:', json.dumps(data['data']['summary'], ensure_ascii=False))
print('Sample log:', json.dumps(data['data']['logs'][0], ensure_ascii=False))
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/test_gr.py', 'w') as f:
    f.write(py_code)
sftp.close()

stdin, stdout, stderr = ssh.exec_command("docker cp /tmp/test_gr.py jacs-studio-prod-api-1:/tmp/test_gr.py && docker exec jacs-studio-prod-api-1 python3 /tmp/test_gr.py")
out = stdout.read().decode('utf-8', errors='ignore')
print(out.encode('ascii', errors='ignore').decode('ascii'))
print(stderr.read().decode('utf-8', errors='ignore'))
ssh.close()
