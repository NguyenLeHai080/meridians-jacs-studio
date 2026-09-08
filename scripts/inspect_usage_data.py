import paramiko
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw')

def run(sql):
    cmd = f"""docker exec -i jacs-studio-prod-postgres-1 psql -U jacs_prod -d jacs_studio_prod << 'EOF'
{sql}
EOF
"""
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace')

print("=== AI_CLIENT_USAGE ===")
print(run("SELECT id, data FROM jacs_records WHERE collection='ai_client_usage' LIMIT 10;"))

print("=== AI_GATEWAY_LOGS (sample) ===")
print(run("SELECT id, data->>'model' as model, data->>'tokens_in' as tin, data->>'tokens_out' as tout, data->>'status_code' as status, data->>'latency_ms' as latency, data->>'license_key' as key, data->>'hwid' as hwid FROM jacs_records WHERE collection='ai_gateway_logs' ORDER BY created_at DESC LIMIT 10;"))

print("=== JOBS (sample) ===")
print(run("SELECT id, data->>'name' as name, data->>'license_id' as lic_id, data->>'tokens_used' as tokens, data->>'credits_used' as credits, data->>'status' as status FROM jacs_records WHERE collection='jobs' ORDER BY created_at DESC LIMIT 10;"))

ssh.close()
