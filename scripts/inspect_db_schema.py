import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw', timeout=15)

cmd = 'docker exec jacs-studio-prod-postgres-1 psql -U postgres -d jacs_studio_prod -c "\dt"'
stdin, stdout, stderr = ssh.exec_command(cmd)
print("TABLES:")
print(stdout.read().decode('utf-8', errors='ignore'))

cmd2 = 'docker exec jacs-studio-prod-postgres-1 psql -U postgres -d jacs_studio_prod -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'licenses\';"'
stdin, stdout, stderr = ssh.exec_command(cmd2)
print("COLUMNS in licenses:")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
