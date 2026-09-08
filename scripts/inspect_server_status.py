import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw')

stdin, stdout, stderr = ssh.exec_command('docker ps')
print("=== DOCKER PS ===")
print(stdout.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = ssh.exec_command('docker exec jacs-studio-prod-api-1 cat /app/app/core/config.py || true')
print("=== API CONFIG ===")
print(stdout.read().decode('utf-8', errors='replace')[:500])

ssh.close()
