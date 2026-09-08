import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw')

test_script = """
import json
from app.core.security import issue_token
from app.core.store import store
import urllib.request

# Generate admin token
token, _ = issue_token("admin@nexoratech.com.vn")

req_ops = urllib.request.Request(
    'http://127.0.0.1:8000/api/v1/telemetry/api-operations',
    headers={'Authorization': f'Bearer {token}'}
)
with urllib.request.urlopen(req_ops) as r_ops:
    ops_data = json.loads(r_ops.read())
    print('=== API OPERATIONS DYNAMIC RESPONSE ===')
    print('Summary:', json.dumps(ops_data['data']['summary'], indent=2, ensure_ascii=False))
    for item in ops_data['data']['data']:
        print(f"Machine: {item['machine_name']} | HWID: {item['machine_hwid']} | Requests: {item['total_requests']} (OK: {item['success_requests']}, Err: {item['error_requests']}) | Tokens: {item['tokens_used']:,} | Cost: {item['financial_summary']['api_cost']:,}đ")
        print(f"   -> Top Requests ({len(item['requests_list'])} items):", [f"{r['model']}:{r['tokens_in']}+{r['tokens_out']}tok" for r in item['requests_list'][:3]])
        print(f"   -> Errors ({len(item['errors_list'])} items):", [f"{e['error_code']}:{e['reason'][:30]}" for e in item['errors_list'][:2]])
"""

stdin, stdout, stderr = ssh.exec_command(f"docker exec -i jacs-studio-prod-api-1 python3 << 'EOF'\n{test_script}\nEOF")
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

ssh.close()
