import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw')

def run(sql):
    cmd = f'docker exec jacs-studio-prod-postgres-1 psql -U postgres -d jacs_studio -c "{sql}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode()

print("--- TABLES ---")
print(run("SELECT table_name FROM information_schema.tables WHERE table_schema='public';"))

print("--- JOBS SCHEMA & COUNT ---")
print(run("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='jobs';"))
print(run("SELECT COUNT(*) FROM jobs;"))

print("--- TELEMETRY SCHEMA & COUNT ---")
print(run("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='telemetry';"))
print(run("SELECT COUNT(*) FROM telemetry;"))
print(run("SELECT * FROM telemetry ORDER BY created_at DESC LIMIT 5;"))

ssh.close()
