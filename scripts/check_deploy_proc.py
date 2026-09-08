import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw')

stdin, stdout, stderr = ssh.exec_command('ps -ef | grep -E "deploy|docker" | grep -v grep')
print("=== PROCESSES ===")
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
