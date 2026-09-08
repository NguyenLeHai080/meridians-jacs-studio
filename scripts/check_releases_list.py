import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw', timeout=15)
cmd = 'docker exec jacs-studio-prod-postgres-1 psql -U postgres -d jacs_studio_prod -t -c "SELECT data->>\'version\', data->>\'status\', data->>\'channel\', data->>\'download_url\' FROM jacs_records WHERE collection = \'releases\';"'
stdin, stdout, stderr = ssh.exec_command(cmd)
print("RELEASES IN PROD DB:")
print(stdout.read().decode('utf-8', errors='ignore'))
ssh.close()
