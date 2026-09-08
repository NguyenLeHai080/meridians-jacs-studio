import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw', timeout=15)

cmd = 'docker exec jacs-studio-prod-postgres-1 psql -U postgres -d jacs_studio_prod -c "SELECT id, key, key_hint, customer_name, hwid, credit_balance, allowed_models, status FROM licenses;"'
stdin, stdout, stderr = ssh.exec_command(cmd)
print("PROD LICENSES:")
print(stdout.read().decode('utf-8', errors='ignore'))

cmd2 = 'docker exec jacs-studio-staging-postgres-1 psql -U postgres -d jacs_studio_staging -c "SELECT id, key, key_hint, customer_name, hwid, credit_balance, allowed_models, status FROM licenses;"'
stdin, stdout, stderr = ssh.exec_command(cmd2)
print("STAGING LICENSES:")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
