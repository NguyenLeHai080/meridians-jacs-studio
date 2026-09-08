import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw', timeout=15)

py_code = """
import urllib.request, json
from app.core.security import issue_token

# 1. Post new AI request telemetry
payload = {
    "model": "gemini-2.5-flash",
    "provider_type": "gemini",
    "latency_ms": 1350,
    "status_code": 200,
    "status": "Oke",
    "tokens_in": 4500,
    "tokens_out": 1200,
    "total_tokens": 5700,
    "credits_deducted": 5.7,
    "cost_vnd": 5700.0,
    "feature_name": "Phân tích Video Multimodal (Desktop App v0.8.34)",
    "license_key": "JACS-PRO-9842",
    "hwid": "JACS-WIN-PROD01",
}

post_req = urllib.request.Request(
    'http://127.0.0.1:8000/api/v1/telemetry/ai-request',
    data=json.dumps(payload).encode(),
    headers={'Content-Type': 'application/json', 'X-License-Key': 'JACS-PRO-9842', 'X-Device-Id': 'JACS-WIN-PROD01'}
)
res = urllib.request.urlopen(post_req)
print('1. Ingest Result:', json.loads(res.read().decode()))

# 2. Query global-requests to see the new live record
tok_res = issue_token("admin@jacs-studio.vn")
tok = tok_res[0] if isinstance(tok_res, tuple) else tok_res
req2 = urllib.request.Request('http://127.0.0.1:8000/api/v1/telemetry/global-requests?limit=5', headers={'Authorization': 'Bearer ' + tok})
res2 = urllib.request.urlopen(req2)
data = json.loads(res2.read().decode())
print('2. Top 1 Log in Admin:', json.dumps(data['data']['logs'][0], ensure_ascii=False))
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/test_ingest.py', 'w') as f:
    f.write(py_code)
sftp.close()

stdin, stdout, stderr = ssh.exec_command("docker cp /tmp/test_ingest.py jacs-studio-prod-api-1:/tmp/test_ingest.py && docker exec jacs-studio-prod-api-1 python3 /tmp/test_ingest.py")
out = stdout.read().decode('utf-8', errors='ignore')
print(out)
err = stderr.read().decode('utf-8', errors='ignore')
if err:
    print("ERR:", err)
ssh.close()
