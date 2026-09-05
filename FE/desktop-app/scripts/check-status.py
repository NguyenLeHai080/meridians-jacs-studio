import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', port=22, username='root', password='4fT0R%GUJgh@a9Vw')

print("--- PROD RELEASES ---")
_, stdout, _ = ssh.exec_command("docker exec -i jacs-studio-prod-postgres-1 psql -U jacs_prod -d jacs_studio_prod -c \"SELECT data->>'version' as version, data->>'platform' as platform, data->>'download_url' as url, updated_at FROM jacs_records WHERE collection = 'releases';\"")
print(stdout.read().decode())

ssh.close()
