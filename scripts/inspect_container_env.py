import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw', timeout=15)

cmd = "docker exec jacs-studio-prod-api-1 env | grep -E 'STORE|SQLITE|DATABASE|DATA'"
stdin, stdout, stderr = ssh.exec_command(cmd)
print("CONTAINER ENV:")
print(stdout.read().decode('utf-8', errors='ignore'))

cmd2 = "docker exec jacs-studio-prod-api-1 ls -la /app /data /app/data /tmp 2>/dev/null"
stdin, stdout, stderr = ssh.exec_command(cmd2)
print("CONTAINER FILES:")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
