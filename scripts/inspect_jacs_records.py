import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw')

def run(sql):
    cmd = f"""docker exec -i jacs-studio-prod-postgres-1 psql -U jacs_prod -d jacs_studio_prod << 'EOF'
{sql}
EOF
"""
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode()

print("--- COLLECTIONS & COUNTS ---")
print(run("SELECT collection, COUNT(*) FROM jacs_records GROUP BY collection;"))

print("--- RECENT TELEMETRY ---")
print(run("SELECT id, data FROM jacs_records WHERE collection='telemetry' ORDER BY created_at DESC LIMIT 5;"))

print("--- RECENT JOBS ---")
print(run("SELECT id, data FROM jacs_records WHERE collection='jobs' ORDER BY created_at DESC LIMIT 5;"))

print("--- RECENT LICENSES ---")
print(run("SELECT id, data->>'customer_name' as name, data->>'hwid' as hwid, data->>'key_hint' as key_hint FROM jacs_records WHERE collection='licenses';"))

ssh.close()
